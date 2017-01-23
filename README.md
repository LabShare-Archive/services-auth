# Services Auth

`services-auth` is a plugin for [LabShare Services](https://github.com/LabShare/services).

```js
const {Services} = require('services'),
    servicesAuth = require('services-auth');
    
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
