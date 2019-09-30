// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/authentication
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Constructor, MethodDecoratorFactory} from '@loopback/context';
import {
  AUTHENTICATION_METADATA_KEY,
  AUTHENTICATION_METADATA_CLASS_KEY,
} from '../keys';
import {
  MetadataInspector,
  ClassDecoratorFactory,
  DecoratorFactory,
} from '@loopback/metadata';

/**
 * Authentication metadata stored via Reflection API
 */
export interface AuthenticationMetadata {
  scope?: string[];
}

class AuthenticateClassDecoratorFactory extends ClassDecoratorFactory<
  AuthenticationMetadata
> {}

/**
 * Mark a controller method as requiring authenticated user.
 *
 * @param options Additional options to configure the authentication.
 * @param options.scope Resource Scopes required by the method
 */
export function authenticate(options?: AuthenticationMetadata) {
  return function authenticateDecoratorForClassOrMethod(
    target: any,
    method?: string,
    methodDescriptor?: TypedPropertyDescriptor<any>,
  ) {
    let spec: AuthenticationMetadata = options || {};

    if (method && methodDescriptor) {
      // Method
      return MethodDecoratorFactory.createDecorator<AuthenticationMetadata>(
        AUTHENTICATION_METADATA_KEY,
        spec,
        {decoratorName: '@authenticate'},
      )(target, method, methodDescriptor);
    }
    if (typeof target === 'function' && !method && !methodDescriptor) {
      // Class
      return AuthenticateClassDecoratorFactory.createDecorator(
        AUTHENTICATION_METADATA_CLASS_KEY,
        spec,
        {decoratorName: '@authenticate'},
      )(target);
    }

    // Not on a class or method
    throw new Error(
      '@intercept cannot be used on a property: ' +
        DecoratorFactory.getTargetName(target, method, methodDescriptor),
    );
  };
}

/**
 * Fetch authentication metadata stored by `@authenticate` decorator.
 *
 * @param controllerClass Target controller
 * @param methodName Target method
 */
export function getAuthenticateMetadata(
  targetClass: Constructor<{}>,
  methodName: string,
): AuthenticationMetadata | undefined {
  // First check method level
  let metadata = MetadataInspector.getMethodMetadata<AuthenticationMetadata>(
    AUTHENTICATION_METADATA_KEY,
    targetClass.prototype,
    methodName,
  );

  if (metadata) return metadata;
  // Check if the class level has `@authenticate`
  metadata = MetadataInspector.getClassMetadata<AuthenticationMetadata>(
    AUTHENTICATION_METADATA_CLASS_KEY,
    targetClass,
  );

  return metadata;
}
