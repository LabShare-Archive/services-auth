[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Greenkeeper badge](https://badges.greenkeeper.io/LabShare/services-auth.svg)](https://greenkeeper.io/)
[![Coverage Status](https://coveralls.io/repos/github/LabShare/services-auth/badge.svg)](https://coveralls.io/github/LabShare/services-auth)
[![codecov](https://codecov.io/gh/LabShare/services-cache/branch/master/graph/badge.svg)](https://codecov.io/gh/LabShare/services-cache)

# Services Auth

`@labshare/services-auth` is an Express.js middleware plugin that integrates with `Express.js` APIs to provide API
Resource Scope authorization with RS256 JWT validation.

## Install

```sh
npm i @labshare/services-auth --save
```

## Options

 * `authUrl` (`String`) - The base URL for a remote LabShare Auth service. Example: `https://a.labshare.org/_api`.
 Required if `secretProvider` is not specified.
 * `tenant` (`String`) - The LabShare Auth Tenant ID the API service is registered to. Required if
 `secretProvider` is not specified.
 * `audience` (`String`) - An optional API service identifier used for JWT `audience` validation. This is the identifier of an API service (OAuth Resource Server) registered to the LabShare Auth system.
 * `issuer` (`String`) - Optional value for validating the JWT issuer (the `iss` claim).
 * `secretProvider` (`Function`) - An optional, custom function for obtaining the signing certificate for RS256. The signature is `(req, header: {alg: string}, payload, cb: (error: Error, signingCert: string) => void): void`.

## Usage

### LabShare Services

This example demonstrates scope-based authorization for an HTTP API module using `@labshare/services` to load the route definition.
With the configuration below, only JWTs containing an audience of `https://my.api.identifier/resource` and a `read:users` scope
would be allowed to access the API route. Additionally, the JWT would be validated against the JSON Web Key Set of the
specified LabShare Auth Tenant.

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
// index.js

const {Services} = require('@labshare/services');
const servicesAuth = require('@labshare/services-auth');

const services = new Services(/* options */);

// Adds scope-based route authentication and authorization to LabShare Service routes and sockets
services.config(servicesAuth({
    authUrl: 'https://ls.auth.io/_api',
    audience: 'https://my.api.identifier/resource',
    issuer: 'LabShare Auth',
    tenant: 'my-tenant'
}));

services.start();
```

### Express.js

The `@labshare/services-auth` module exports generic Express.js middleware for route authentication.

```js
// index.js

const app = require('express')();
const servicesAuth = require('@labshare/services-auth');

// Adds route authentication to the Express.js routes
app.use('/protected/*', servicesAuth.express({
    authUrl: 'https://ls.auth.io/_api',
    audience: 'https://my.api.identifier/resource',
    issuer: 'LabShare Auth',
    tenant: 'my-tenant'
}));

app.listen(3000);
```

## Development

1. Install Node.js >= 8.11.2
2. `npm i`

## Tests

`npm test`
