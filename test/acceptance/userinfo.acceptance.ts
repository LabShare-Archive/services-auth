import {
  SequenceHandler,
  SequenceActions,
  FindRoute,
  ParseParams,
  InvokeMethod,
  Reject,
  RequestContext,
  RestServer,
  RestComponent,
  RestBindings,
  Send,
  get,
} from '@loopback/rest';
import * as portfinder from 'portfinder';
import * as express from 'express';
import * as http from 'http';
import {inject, Application} from '@loopback/core';
import {
  AuthenticateFn,
  LbServicesAuthComponent,
  AuthenticationBindings,
} from '../..';

import {Client, createClientForHandler, expect} from '@loopback/testlab';

describe('User Info Sequence Action', () => {
  let authApp: any;
  let app: Application;
  let server: RestServer;
  let authServerUrl: string;
  let authServer: any;
  let authServerPort: number;

  const tenant = 'ls';

  beforeEach(done => {
    authApp = express();

    authApp.get(`/auth/${tenant}/me`, (req: any, res: any) => {
      res.json({
        email: 'email@example.com',
      });
    });

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

  it('gets the current user', async () => {
    const client = whenIMakeRequestTo(server);
    const res = await client
      .get('/currentUser')
      .set('Authorization', 'Bearer asdef');

    expect(res.body.email).to.equal('email@example.com');
  });

  function givenAuthenticatedSequence() {
    class MySequence implements SequenceHandler {
      constructor(
        @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
        @inject(SequenceActions.PARSE_PARAMS)
        protected parseParams: ParseParams,
        @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
        @inject(SequenceActions.SEND) protected send: Send,
        @inject(SequenceActions.REJECT) protected reject: Reject,
        @inject(AuthenticationBindings.USER_INFO_ACTION)
        protected getUserInfo: AuthenticateFn,
      ) {}

      async handle(context: RequestContext) {
        try {
          const {request, response} = context;
          const route = this.findRoute(request);

          // Authenticate
          await this.getUserInfo(request as any, response as any);

          // Authentication successful, proceed to invoke controller
          const args = await this.parseParams(request, route);
          const result = await this.invoke(route, args);
          this.send(response, result);
        } catch (error) {
          this.reject(context, error);
        }
      }
    }

    // bind user defined sequence
    server.sequence(MySequence);
  }

  function whenIMakeRequestTo(restServer: RestServer): Client {
    return createClientForHandler(restServer.requestHandler);
  }

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
    class MyController {
      constructor(
        @inject(RestBindings.Http.REQUEST) public request: express.Request,
      ) {}

      @get('/currentUser', {
        responses: {
          '200': {
            description: '',
            schema: {
              type: 'object',
            },
          },
        },
      })
      async currentUser(): Promise<any> {
        return (this.request as any).userInfo;
      }
    }

    app.controller(MyController);
  }
});
