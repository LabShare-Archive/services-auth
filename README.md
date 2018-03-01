# Services Auth

`@labshare/services-auth` is a plugin that integrates with [@labshare/services](https://www.npmjs.com/package/@labshare/services) to
provide Socket.io and Express.js API Resource Scope authorization with RS256 JWT validation.

## Install

```sh
npm i @labshare/services-auth --save
```

## Options

 * `authUrl` (`String`) - The base URL for a remote LabShare Auth service. Example: `https://a.labshare.org/_api`. Required.
 * `organization` (`String`) - The LabShare Auth organization ID the API service is registered to. Required if `secretProvider` is not specified.
 * `audience` (`String`) - An optional API service identifier registered to the LabShare Auth service. This is used for JWT `audience` validation.
 * `issuer` (`String`) - Optional value for validating the JWT issuer (the `iss` claim).
 * `secretProvider` (`Function`) - An optional, custom function for obtaining the signing certificate for RS256. The signature is `(req, header: {alg: string}, payload, cb: (error: Error, signingCert: string) => void): void`.

## Usage

This example demonstrates scope-based authorization for an HTTP API module using `@labshare/services` to load the route definition.
With the configuration below, only JWTs containing an audience of `https://my.api.identifier/resource` and a `read:users` scope
would be allowed to access the API route. Additionally, the JWT would be validated using the JSON Web Key Set of the specified organization.

```js
// api/users.js

module.exports = {
    routes: [
        {
            path: '/users',
            httpMethod: 'GET',
            middleware: getUsers,
            scope: [
                'read:users'
            ]
        }
    ]
}
```

```js
// lib/index.js

const {Services} = require('@labshare/services'),
    servicesAuth = require('@labshare/services-auth');

const services = new Services(/* options */);

// Adds scope-based route authentication and authorization to LabShare Service routes and sockets
services.config(servicesAuth({
    authUrl: 'https://ls.auth.io/_api',
    audience: 'https://my.api.identifier/resource',
    issuer: 'LabShare Auth',
    organization: 'my-org'
}));

services.start();
```

## Development
1. Install Node.js 6+
2. Run `npm install` in the root directory of `services-auth`.

## Tests
`npm test`
