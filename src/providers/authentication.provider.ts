import {Getter, Provider, inject, Constructor} from '@loopback/context';
import {
  Request,
  Response,
  SequenceActions,
  ParseParams,
  FindRoute,
  ParameterObject,
} from '@loopback/rest';
import {AuthenticateFn, AuthenticationBindings} from '../keys';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'express-jwt';
import parseToken from 'parse-bearer-token';
import {CoreBindings} from '@loopback/core';
import {get} from 'lodash';
import {getAuthenticateMetadata} from '../decorators/authenticate.decorator';
import * as express from 'express';

const defaultJwksClientOptions = {
  cache: true,
  rateLimit: true, // See: https://github.com/auth0/node-jwks-rsa#rate-limiting
  jwksRequestsPerMinute: 10,
};

interface ParsedParams {
  path: {[key: string]: any};
  query: {[key: string]: any};
}

export interface IsRevokedCallback {
  (
    req: express.Request,
    payload: any,
    done: (err: any, revoked?: boolean) => void,
  ): Promise<void> | void;
}

export interface SecretCallbackLong {
  (
    req: express.Request,
    header: any,
    payload: any,
    done: (err: any, secret?: jwt.secretType) => void,
  ): Promise<void> | void;
}
export interface SecretCallback {
  (
    req: express.Request,
    payload: any,
    done: (err: any, secret?: jwt.secretType) => void,
  ): Promise<void> | void;
}

/**
 * @description Provider of a function which authenticates
 * @example `context.bind('authentication_key')
 *   .toProvider(AuthenticateActionProvider)`
 */
export class AuthenticateActionProvider implements Provider<AuthenticateFn> {
  constructor(
    @inject.getter(AuthenticationBindings.AUTH_CONFIG)
    readonly getConfig: Getter<{
      [key: string]: any;
    }>,
    @inject.getter(CoreBindings.CONTROLLER_CLASS, {optional: true})
    private readonly getController: Getter<Constructor<{}>>,
    @inject.getter(CoreBindings.CONTROLLER_METHOD_NAME, {optional: true})
    private readonly getMethod: Getter<string>,
    @inject.getter(AuthenticationBindings.SECRET_PROVIDER, {optional: true})
    private readonly secretProvider: Getter<
      SecretCallback | SecretCallbackLong
    >,
    @inject.getter(AuthenticationBindings.IS_REVOKED_CALLBACK_PROVIDER, {
      optional: true,
    })
    private readonly isRevokedCallbackProvider: Getter<IsRevokedCallback>,
    @inject(SequenceActions.PARSE_PARAMS)
    private readonly parseParams: ParseParams,
    @inject(SequenceActions.FIND_ROUTE) private readonly findRoute: FindRoute,
  ) {}

  value(): AuthenticateFn {
    return (request: any, response: any) => this.action(request, response);
  }

  /**
   * The implementation of authenticate() sequence action.
   * @param request The incoming request provided by the REST layer
   * @param response The response provided by the REST layer
   */
  async action(request: Request, response: Response): Promise<any> {
    const controller = await this.getController();
    const method = await this.getMethod();

    const metadata = getAuthenticateMetadata(controller, method);

    // If REST method or class is not decorated, we skip the authentication check
    if (!metadata) {
      return;
    }

    const {authUrl, tenant, audience, issuer} = await this.getConfig();

    if (!authUrl && !this.secretProvider) {
      throw new Error('`authUrl` is required');
    }

    if (!tenant && !this.secretProvider) {
      throw new Error('`tenant` is required');
    }

    const jwksClientOptions = {
      ...defaultJwksClientOptions,
      jwksUri: `${authUrl}/auth/${tenant}/.well-known/jwks.json`,
    };

    const secret =
      (await this.secretProvider()) ||
      jwksClient.expressJwtSecret(jwksClientOptions);
    const isRevoked = await this.isRevokedCallbackProvider();

    // Validate JWT in Authorization Bearer header using RS256
    await new Promise((resolve, reject) => {
      jwt({
        getToken: parseToken,
        isRevoked,
        secret,
        audience, // Optionally validate the audience and the issuer
        issuer,
      })(request, response, (error: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });

    const scope = [...((metadata && metadata.scope) || [])];

    // Validate JWT Resource Scopes against one or more scopes required by the API.
    // For example: 'read:users'
    if (scope.length) {
      await this.validateResourceScopes(scope)(request, response);
    }
  }

  /**
   * @description Validates Resource Scopes required by an API definition against the user's bearer token scope claim.
   * @param {string[]} expectedScopes
   */
  private validateResourceScopes(expectedScopes: string[]) {
    const error = (res: any) => res.status(403).send('Insufficient scope');

    if (!Array.isArray(expectedScopes)) {
      throw new Error(
        'Parameter expectedScopes must be an array of strings representing the scopes for the endpoint(s)',
      );
    }

    return async (req: any, res: any) => {
      if (expectedScopes.length === 0) {
        return;
      }
      if (!req.user || typeof req.user.scope !== 'string') {
        return error(res);
      }

      const replaceValue = (parsedParamsObj: ParsedParams) => (
        $0: string,
        context: string,
      ) => {
        return get(parsedParamsObj, context);
      };

      const route = this.findRoute(req);
      const args = await this.parseParams(req, route);
      const params = route.spec.parameters;
      const parsedParams: ParsedParams = {
        path: {},
        query: {},
      };

      if (params) {
        for (let i = 0; i < args.length; ++i) {
          const spec = params[i] as ParameterObject;
          const paramIn = spec.in;
          switch (paramIn) {
            case 'path':
            case 'query':
              parsedParams[paramIn][spec.name] = args[i];
              break;
          }
        }
      }

      // Fill in dynamic scope parameters with the request parameters.
      // For example, "{path.tenantId}:read:users" becomes "ls:read:users" assuming
      // "tenantId" is a path parameter.
      const expandedScopes = expectedScopes.map((scope: string) => {
        return scope.replace(/{([^}]+)}/g, replaceValue(parsedParams));
      });

      const scopes = req.user.scope.split(' ');
      const allowed = expandedScopes.some(scope => scopes.includes(scope));

      if (allowed) {
        return;
      }

      error(res);
    };
  }
}
