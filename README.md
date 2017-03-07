# Services Auth

`@labshare/services-auth` is a plugin for [@labshare/services](https://github.com/LabShare/services).

## Install

```sh
npm i @labshare/services-auth --save
```

## Usage

```js
const {Services} = require('@labshare/services'),
    servicesAuth = require('@labshare/services-auth');
    
let services = new Services(/* options */);

// Add role-based route authentication and authorization to LabShare Service routes and sockets
services.config(servicesAuth({
    authUrl: 'https://some.auth.endpoint.org/_api/auth/me'
}));

services.start();
```

## Development
1. Install Node.js 6+
2. Run `npm install` in the root directory of `services-auth`.

## Tests
`npm test`
