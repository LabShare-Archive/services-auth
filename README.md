# @labshare/services-auth

[![Build Status](https://travis-ci.org/LabShare/services-auth.svg?branch=master)](https://travis-ci.org/LabShare/services-auth)

# Install

`npm i @labshare/services-auth`

# Usage

Register the component and register the configuration for the action by injecting `AuthenticationBindings.AUTH_CONFIG`.

## Configuring the component

## Options

| Property |  Type  | Details                                                                                                                                                                                                                                                                                                   |
| :------- | :----: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tenant   | string | The LabShare Auth Tenant the Resource Server (API) is registered to. Example: `ncats`.                                                                                                                                                                                                                    |
| authUrl  | string | The full URL to the LabShare Auth API the Resource Server (API) is registered to. Example: `https://a.labshare.org`                                                                                                                                                                                       |
| audience | string | The audience of the Resource Server. This is a unique identifier for the API registered on the LabShare Auth Service. It does not need match an actual API deployment host. This is required to check if a Client (application) is allowed to access the API. Example: `https://my.api.com/v2`. Optional. |
| issuer   | string | The issuer of the Bearer Token. Use this to validate the source of the Bearer Token. Optional. Example: `https://a.labshare.org/_api/ls`                                                                                                                                                                  |

## Bindings (optional)

To perform additional customization of token validation, you can bind Loopback [Providers](https://loopback.io/doc/en/lb4/Creating-components.html#providers) to the following keys:

| Binding                                               |                                                                               Details                                                                               |
| :---------------------------------------------------- | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| `AuthenticationBindings.SECRET_PROVIDER`              |                           Obtains the secret used to validate the JWT signature. Not required when using tokens signed by LabShare Auth.                            |
| `AuthenticationBindings.IS_REVOKED_CALLBACK_PROVIDER` |              Used to check if the token has been revoked. For example, a request to the `introspection_endpoint` can check if the JWT is still valid.               |
| `AuthenticationBindings.AUDIENCE_PROVIDER`            | Provides the value for the audience the JWT will be validated against instead of using the audience configuration assigned to `AuthenticationBindings.AUTH_CONFIG`. |

### Example IsRevokedCallbackProvider

```ts
import request = require('request-promise');

export class IsRevokedCallbackProvider {
  constructor() {}

  public async value() {
    return async (
      req: Request,
      payload,
      callback: (error: Error, isRevoked: boolean) => void
    ) => {
      try {
        // ... request to introspection endpoint
        // ... check if token is valid

        callback(null, isTokenRevoked);
      } catch (error) {
        callback(error, false);
      }
    };
  }
}
```

### Example SecretProvider

```ts
import { jwk2pem } from 'pem-jwk';

export class SecretProvider {
  constructor(
    @inject('MyJwkService')
    private jwkService: JwkService
  ) {}

  public async value() {
    return async (
      req: Request,
      header,
      payload: any,
      cb: (err: any, secret?: any) => void
    ): Promise<void> => {
      if (!header) {
        log('Invalid JWT. No header found.');
        cb(null, null);
        return;
      }

      if (header.alg !== 'RS256' || !payload || !payload.sub) {
        cb(null, null);
        return;
      }

      try {
        const publicJWK = await this.jwkService.getPublicJWK('...');
        const secret = jwk2pem(publicJWK);

        cb(null, secret);
      } catch (error) {
        cb(null, null);
      }
    };
  }
}
```

### Example AudienceProvider

```ts
export class SecretProvider {
  constructor(
    // Constructor can inject services used to figure out which audience to use
    @inject(RestBindings.Http.REQUEST)
    public request: Request
  ) {}

  public async value() {
    // Determine the audience the JWT should be validated against, perhaps based on a value in the API request
    return 'https://some.new.audience';
  }
}
```

#### Application Bootstrap Example

```ts
import { LbServicesAuthComponent } from '@labshare/lb-services-auth';
import { SecretProvider } from 'secret.provider';
import { AudienceProvider } from 'audience.provider';
import { IsRevokedCallbackProvider} from 'is-revoked-callback.provider';

app = new Application();
app.component(LbServicesAuthComponent);
app.bind(AuthenticationBindings.AUTH_CONFIG).to({
  authUrl: 'https://a.labshare.org/_api',
  tenant: 'my-tenant'
});

// Assign a custom JWT secret provider (optional)
app.bind(AuthenticationBindings.SECRET_PROVIDER).toProvider(SecretProvider);

// Assign a custom revoked JWT check (optional)
app.bind(AuthenticationBindings.IS_REVOKED_CALLBACK_PROVIDER).toProvider(IsRevokedCallbackProvider);

// Assign a custom audience provider (optional)
app.bind(AuthenticationBindings.IS_REVOKED_CALLBACK_PROVIDER).toProvider(AudienceProvider);
```

## Actions

### Authenticate

Inject the authenticate action into the application sequence to require the user to pass a valid bearer token and
optionally validate the bearer token's scope and audience claims. Ensure the authenticate action runs before the controller methods are invoked (see the example).

#### Example

```ts
import {
  AuthenticationBindings,
  AuthenticateFn
} from "@labshare/lb-services-auth";

class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS)
    protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,

    // Inject the new authentication action
    @inject(AuthenticationBindings.AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      // Authenticate the request. We need this sequence action to run before "invoke" to ensure authentication
      // occurs first.
      await this.authenticateRequest(request as any, response as any);

      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (error) {
      this.reject(context, error);
      return;
    }
}
```

### User Info

Inject the user info action provider into your application sequence to assign the user's profile on `request.userInfo`.
The profile corresponds to the response returned by LabShare Auth's OIDC `user_info` route.

#### Example

```ts
import {
  AuthenticationBindings,
  AuthenticateFn
} from "@labshare/lb-services-auth";

class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS)
    protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,

    // Inject the new authentication action
    @inject(AuthenticationBindings.USER_INFO_ACTION)
    protected setUserInfo: AuthenticateFn,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      // Set the userInfo on the request
      await this.setUserInfo(request as any, response as any);

      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (error) {
      this.reject(context, error);
      return;
    }
}
```

## Decorators

### @authenticate

Use the `@authenticate` decorator for REST methods or controllers requiring authentication.

## Options

| Property | Type  | Details                                                                                                    |
| :------- | :---: | :--------------------------------------------------------------------------------------------------------- |
| scopes   | array | A list of one zero or more arbitrary Resource Scope definitions. Example: `['read:users', 'update:users']` |
| credentialsRequired | boolean | Set to `false` to support anonymous/public requests on an endpoint. Defaults to `true`.       |

### Dynamic Scopes

Dynamic path/query parameters can be injected into scope definitions using brackets. For example: [`read:users:{path.id}`, `update:users:{query.limit}`] assigned to a route such as `/users/{id}` would require the request's bearer token to contain a scope
matching the `id` parameter in the route (for example: `'read:users:5'` if the request route is `/users/5`).

#### Example

```ts
import { authenticate } from "@labshare/lb-services-auth";
import { Request } from "@loopback/core";

// Attach the decorator at the controller level to require authentication on all methods
// and a scope of `my:shared:scope`
@authenticate({
  scope: 'my:shared:scope'
})
class MyController {
  constructor(
    @inject(RestBindings.Http.REQUEST) public request: Request
  ) {}

  @authenticate()
  @get('/whoAmI', {
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
  async whoAmI(): Promise<string> {
    return 'authenticated data';
  }

  // This route supports both authenticated and anonymous requests
  @authenticate({
    credentialsRequired: false
  })
  @get('/resource', {
    'x-operation-name': 'resource',
    responses: {
      '200': {
        description: '',
        schema: {
          type: 'string',
        },
      },
    },
  })
  async resource(): Promise<string> {
    if (this.request.user) {
      return 'Resource requiring authentication';
    }

    return 'Public resource';
  }

  // This route has an additional Resource Scope requirement. The user's bearer token will need to contain
  // 'read:users' in the `scope` claim. Otherwise, they will receive a 403 in the response.
  @authenticate({
    scope: ['read:users']
  })
  @get('/users', {
    'x-operation-name': 'users',
    responses: {
      '200': {
        description: '',
        schema: {
          type: 'string',
        },
      },
    }
  })
  async users(): Promise<string> {
    return 'users';
  }

  // This route has a dynamic scope parameter for validation.
  // The request will be unauthorized if the JWT does not contain the "tenantId", "someOtherParam" values in the route path and the "someParam" query parameter.
  @authenticate({
    scope: ['{path.tenantId}:read:users:{query.someParam}:{path.someOtherParam}']
  })
  @get('{tenantId}/users')
  async users(
    @param.path.string('tenantId') tenantId: string,
    @param.path.number('someOtherParam') someOtherParam: number,
    @param.query.boolean('someParam') someParam: boolean
  ): Promise<string> {
    return `${tenantId} users';
  }
}

app.controller(MyController);
```
