// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/authentication
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Constructor, MethodDecoratorFactory} from '@loopback/context';
import {
  AUTHENTICATION_METADATA_KEY,
  CONTROLLER_AUTHENTICATION_METADATA_KEY,
} from '../keys';
import {MetadataInspector, ClassDecoratorFactory} from '@loopback/metadata';

/**
 * Authentication metadata stored via Reflection API
 */
export interface AuthenticationMetadata {
  scope?: string[];
}

/**
 * Mark a controller method as requiring authenticated user.
 *
 * @param options Additional options to configure the authentication.
 * @param options.scope Resource Scopes required by the method
 */
export function authenticate(options?: AuthenticationMetadata) {
  return MethodDecoratorFactory.createDecorator<AuthenticationMetadata>(
    AUTHENTICATION_METADATA_KEY,
    options || {},
  );
}

/**
 * Mark a controller as requiring an authenticated user.
 *
 * @param options Additional options to configure the authentication.
 * @param options.scope Resource Scopes required by the method
 */
export function authenticateController(options?: AuthenticationMetadata) {
  return ClassDecoratorFactory.createDecorator<AuthenticationMetadata>(
    CONTROLLER_AUTHENTICATION_METADATA_KEY,
    options || {},
  );
}

/**
 * Fetch class authentication metadata stored by `@authenticateController` decorator.
 *
 * @param controllerClass Target controller
 */
export function getAuthenticateControllerMetadata(
  controllerClass: Constructor<{}>,
): AuthenticationMetadata | undefined {
  if (!controllerClass) {
    return;
  }

  return MetadataInspector.getClassMetadata<AuthenticationMetadata>(
    CONTROLLER_AUTHENTICATION_METADATA_KEY,
    controllerClass,
  );
}

/**
 * Fetch authentication metadata stored by `@authenticate` decorator.
 *
 * @param controllerClass Target controller
 * @param methodName Target method
 */
export function getAuthenticateMetadata(
  controllerClass: Constructor<{}>,
  methodName: string,
): AuthenticationMetadata | undefined {
  if (!controllerClass) {
    return;
  }

  return MetadataInspector.getMethodMetadata<AuthenticationMetadata>(
    AUTHENTICATION_METADATA_KEY,
    controllerClass.prototype,
    methodName,
  );
}
