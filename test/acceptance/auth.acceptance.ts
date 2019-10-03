import {Application} from '@loopback/core';
import {
  RestBindings,
  ParseParams,
  FindRoute,
  InvokeMethod,
  Send,
  Reject,
  SequenceHandler,
  RestServer,
  RestComponent,
  RequestContext,
} from '@loopback/rest';
import {api, get, param} from '@loopback/openapi-v3';
import {Client, createClientForHandler, expect} from '@loopback/testlab';
import {anOpenApiSpec} from '@loopback/openapi-spec-builder';
import {inject} from '@loopback/context';
import {AuthenticateFn, AuthenticationBindings, authenticate} from '../../src';
import {LbServicesAuthComponent} from '../../src';
import * as jws from 'jsonwebtoken';
import {pem2jwk} from 'pem-jwk';
import * as portfinder from 'portfinder';
import * as express from 'express';
import * as http from 'http';

const selfsigned = require('selfsigned');
const SequenceActions = RestBindings.SequenceActions;

describe('Basic Authentication', () => {
  let authApp: any;
  let app: Application;
  let server: RestServer;
  let authServerUrl: string;
  let authServer: any;
  let authServerPort: number;

  const tenant = 'ls';
  const defaultAudience = 'https://my.api.id/v2';
  const certificates = selfsigned.generate(
    [
      {
        name: 'commonName',
        value: 'labshare.org',
      },
    ],
    {
      days: 365,
    },
  );

  /**
   * Helper for creating a bearer token for RS256
   * @param {string} sub
   * @param {string} scope
   * @param {string} audience
   * @returns {any}
   */
  function createToken(sub: string, scope = '', audience = defaultAudience) {
    return jws.sign(
      {
        jti: 123456,
        azp: 123,
        scope,
      },
      certificates.private,
      {
        subject: sub,
        algorithm: 'RS256',
        expiresIn: '10m',
        issuer: 'issuer',
        keyid: '1',
        audience: [audience],
      },
    );
  }

  beforeEach(done => {
    authApp = express();

    // Create a JSON Web Key from the PEM
    const jwk: any = pem2jwk(certificates.private);

    // Azure AD checks for the 'use' and 'kid' properties
    jwk.kid = '1';
    jwk.use = 'sig';

    authApp.get(
      `/auth/${tenant}/.well-known/jwks.json`,
      (req: any, res: any) => {
        res.json({
          keys: [jwk],
        });
      },
    );

    portfinder.getPort((err, unusedPort) => {
      if (err) {
        done(err);
        return;
      }

      authServerPort = unusedPort;
      authServerUrl = `http://localhost:${authServerPort}`;
      authServer = http.createServer(authApp).listen(unusedPort);

      done();
    });
  });

  afterEach(done => {
    authServer.close(done);
  });

  beforeEach(givenAServer);
  beforeEach(givenControllerInApp);
  beforeEach(givenAuthenticatedSequence);

  it('authenticates successfully for correct credentials', async () => {
    const token = createToken('abc', 'shared:scope');
    const client = whenIMakeRequestTo(server);
    const res = await client
      .get('/whoAmI')
      .set('Authorization', 'Bearer ' + token);
    expect(res.body.sub).to.equal('abc');
  });

  it('authorizes an API with Resource Scope requirements', async () => {
    const token = createToken('abc', 'shared:scope read:users');
    const client = whenIMakeRequestTo(server);
    await client
      .get('/users')
      .set('Authorization', 'Bearer ' + token)
      .expect('all users');
  });

  it('authorizes an API by expanding dynamic resource scopes', async () => {
    const token = createToken(
      'ls:read:users',
      'shared:scope ls:update:users:100',
    );
    const client = whenIMakeRequestTo(server);
    await client
      .get('/ls/users?limit=100')
      .set('Authorization', 'Bearer ' + token)
      .expect(`received 100 users from tenant ls`);
  });

  it('returns an error for invalid bearer tokens', async () => {
    const client = whenIMakeRequestTo(server);
    await client
      .get('/whoAmI')
      .set('Authorization', 'Bearer ' + 'invalid-token')
      .expect(401);
  });

  it('returns an error for bearer tokens missing required scope claims', async () => {
    const token = createToken('abc');
    const client = whenIMakeRequestTo(server);
    await client
      .get('/users')
      .set('Authorization', 'Bearer ' + token)
      .expect(403);
  });

  it('allows anonymous requests to methods with no decorator', async () => {
    class InfoController {
      @get('/status')
      status() {
        return {running: true};
      }
    }

    app.controller(InfoController);
    await whenIMakeRequestTo(server)
      .get('/status')
      .expect(200, {running: true});
  });

  async function givenAServer() {
    app = new Application();
    app.component(LbServicesAuthComponent);
    app.component(RestComponent);
    app.bind(AuthenticationBindings.AUTH_CONFIG).to({
      authUrl: authServerUrl,
      tenant,
    });
    server = await app.getServer(RestServer);
  }

  function givenControllerInApp() {
    const apispec = anOpenApiSpec()
      .withOperation('get', '/whoAmI', {
        'x-operation-name': 'whoAmI',
        responses: {
          '200': {
            description: '',
            schema: {
              type: 'string',
            },
          },
        },
      })
      .withOperation('get', '/users', {
        'x-operation-name': 'users',
        responses: {
          '200': {
            description: '',
            schema: {
              type: 'string',
            },
          },
        },
      })
      .build();

    @authenticate({
      scope: ['shared:scope'],
    })
    @api(apispec)
    class MyController {
      constructor(
        @inject(RestBindings.Http.REQUEST) public request: express.Request,
      ) {}

      @authenticate()
      async whoAmI(): Promise<any> {
        return (this.request as any).user;
      }

      @authenticate({
        scope: ['read:users'],
      })
      async users(): Promise<string> {
        return 'all users';
      }

      @authenticate({
        scope: [
          '{path.tenantId}:read:users',
          '{path.tenantId}:update:users:{query.limit}',
        ],
      })
      @get('/{tenantId}/users', {
        'x-operation-name': 'users',
        responses: {
          '200': {
            description: '',
            schema: {
              type: 'string',
            },
          },
        },
      })
      async user(
        @param.path.string('tenantId') tenantId: string,
        @param.query.number('limit') limit: number,
      ): Promise<string> {
        return `received ${limit} users from tenant ${tenantId}`;
      }
    }

    app.controller(MyController);
  }

  function givenAuthenticatedSequence() {
    class MySequence implements SequenceHandler {
      constructor(
        @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
        @inject(SequenceActions.PARSE_PARAMS)
        protected parseParams: ParseParams,
        @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
        @inject(SequenceActions.SEND) protected send: Send,
        @inject(SequenceActions.REJECT) protected reject: Reject,
        @inject(AuthenticationBindings.AUTH_ACTION)
        protected authenticateRequest: AuthenticateFn,
      ) {}

      async handle(context: RequestContext) {
        try {
          const {request, response} = context;
          const route = this.findRoute(request);

          // Authenticate
          await this.authenticateRequest(request as any, response as any);

          // Authentication successful, proceed to invoke controller
          const args = await this.parseParams(request, route);
          const result = await this.invoke(route, args);
          this.send(response, result);
        } catch (error) {
          this.reject(context, error);
          return;
        }
      }
    }

    // bind user defined sequence
    server.sequence(MySequence);
  }

  function whenIMakeRequestTo(restServer: RestServer): Client {
    return createClientForHandler(restServer.requestHandler);
  }
});
