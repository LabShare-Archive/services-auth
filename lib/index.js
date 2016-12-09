'use strict';

const ensureAuthorized = require('./ensure-authorized'),
    restrict = require('./restrict'),
    _ = require('lodash');

module.exports = function ({authUrl}) {
    assert.ok(_.string(authUrl, `services-auth: "authUrl" is required!`));
    
    return function servicesAuth({services, app}) {
        _.each(services, routes => {
            routes.forEach(route => {
                route.middleware.unshift(restrict(route, authUrl), ensureAuthorized(route));
            });
        });
    };
};
