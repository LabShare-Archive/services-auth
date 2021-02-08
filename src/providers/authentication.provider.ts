import {Getter, Provider, inject, Constructor} from '@loopback/context';
import {
  Request,
  Response,
  SequenceActions,
  ParseParams,
  FindRoute,
  ParameterObject,
  HttpErrors,
} from '@loopback/rest';
import {AuthenticateFn, AuthenticationBindings} from '../keys';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'express-jwt';
import getToken from 'parse-bearer-token';
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

interface RequestWithUser extends Request {
  user?: {};
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
    @inject.getter(AuthenticationBindings.AUDIENCE_PROVIDER, {
      optional: true,
    })
    private readonly audienceProvider: Getter<any>,
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
  async action(request: RequestWithUser, response: Response): Promise<any> {
    const controller = await this.getController();
    const method = await this.getMethod();

    if (!controller || !method) {
      return;
    }

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
    const jwtAudience = (await this.audienceProvider()) || audience;
    const credentialsRequired =
      typeof metadata.credentialsRequired !== undefined
        ? metadata.credentialsRequired
        : true;

    // Validate JWT in Authorization Bearer header using RS256
    await new Promise<void>((resolve, reject) => {
      jwt({
        getToken,
        isRevoked,
        secret,
        audience: jwtAudience, // Optionally validate the audience and the issuer
        issuer,
        credentialsRequired,
      })(request, response, (error: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });

    // If user authentication is optional on the request, avoid checking the user's scopes
    if (!request.user && !credentialsRequired) {
      return;
    }

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
    if (!Array.isArray(expectedScopes)) {
      throw new Error(
        'Parameter expectedScopes must be an array of strings representing the scopes for the endpoint(s)',
      );
    }

    return async (req: any, _res: any) => {
      if (expectedScopes.length === 0) {
        return;
      }

      const insufficientScopeError = `Insufficient scope. Required scopes: ${expectedScopes.join(
        ' ',
      )}`;

      if (!req.user || typeof req.user.scope !== 'string') {
        throw new HttpErrors.Forbidden(insufficientScopeError);
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
          if (!spec) continue; // when executing patch, the spec might be undefined
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
      throw new HttpErrors.Forbidden(insufficientScopeError);
    };
  }
}
