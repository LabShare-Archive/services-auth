/**
 * Binding keys used by this component.
 */
import {BindingKey} from '@loopback/context';
import {AuthenticationMetadata} from './decorators/authenticate.decorator';
import {MetadataAccessor} from '@loopback/metadata';
import {Request, Response} from 'express';
import {SecretCallback, IsRevokedCallback} from 'express-jwt';

/**
 * Interface definition of a function which accepts a request
 * and returns an authenticated user
 */
export interface AuthenticateFn {
  (request: Request, response: Response): Promise<any>;
}

export namespace AuthenticationBindings {
  /**
   * Key used to inject the authentication function into the sequence.
   *
   * ```ts
   * class MySequence implements SequenceHandler {
   *   constructor(
   *     @inject(AuthenticationBindings.AUTH_ACTION)
   *     protected authenticateRequest: AuthenticateFn,
   *     // ... other sequence action injections
   *   ) {}
   *
   *   async handle(context: RequestContext) {
   *     try {
   *       const {request, response} = context;
   *       const route = this.findRoute(request);
   *
   *      // Authenticate
   *       await this.authenticateRequest(request);
   *
   *       // Authentication successful, proceed to invoke controller
   *       const args = await this.parseParams(request, route);
   *       const result = await this.invoke(route, args);
   *       this.send(response, result);
   *     } catch (err) {
   *       this.reject(context, err);
   *     }
   *   }
   * }
   * ```
   */
  export const AUTH_ACTION = BindingKey.create<AuthenticateFn>(
    'authentication.actions.authenticate',
  );

  export const USER_INFO_ACTION = BindingKey.create<AuthenticateFn>(
    'authentication.actions.userInfo',
  );

  /**
   * Key used to set configuration for the authentication action
   * @type {BindingKey<any>}
   */
  export const AUTH_CONFIG = BindingKey.create<any>('authentication.config');

  /**
   * The key used to set the custom RS256/HS256 secret provider
   */
  export const SECRET_PROVIDER = BindingKey.create<SecretCallback>(
    'authentication.secretProvider',
  );

  /**
   * The key used to set the custom RS256/HS256 secret provider
   */
  export const IS_REVOKED_CALLBACK_PROVIDER = BindingKey.create<
    IsRevokedCallback
  >('authentication.isRevokedCallbackProvider');
}

/**
 * The key used to store method authentication decorator metadata
 */
export const AUTHENTICATION_METADATA_KEY = MetadataAccessor.create<
  AuthenticationMetadata,
  MethodDecorator
>('authentication.method.operationsMetadata');

/**
 * The key used to store class-level metadata for `@authenticate`
 */
export const AUTHENTICATION_METADATA_CLASS_KEY = MetadataAccessor.create<
  AuthenticationMetadata,
  ClassDecorator
>('authentication:class');
