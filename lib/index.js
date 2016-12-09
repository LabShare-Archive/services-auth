'use strict';

const ensureAuthorized = require('./ensure-authorized'),
    restrict = require('./restrict'),
    assert = require('assert'),
    _ = require('lodash');

/**
 * @description
 * @param {String} authUrl - The authentication endpoint used to obtain user profile information
 * @returns {function()} A LabShare Services configuration function that adds role-based authentication middleware to each route
 */
module.exports = function authServices({authUrl}) {
    assert.ok(_.isString(authUrl, `services-auth: "authUrl" is required!`));
    
    return ({services}) => {
        _.each(services, routes => {
            routes.forEach(route => {
                if (route.accessLevel) {
                    route.middleware.unshift(restrict(route, authUrl), ensureAuthorized(route));
                }
            });
        });
    }
};
