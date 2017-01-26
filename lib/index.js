'use strict';

const routeEnsureAuthorized = require('./route-ensure-authorized'),
    socketEnsureAuthorized = require('./socket-ensure-authorized'),
    restrictRoute = require('./restrict-route'),
    restrictSocket = require('./restrict-socket'),
    assert = require('assert'),
    _ = require('lodash');

/**
 * @description
 * @param {String} authUrl - The authentication endpoint used to obtain user profile information
 * @returns {function()} A LabShare Services configuration function that adds role-based authentication middleware
 * to each socket and route definition.
 */
module.exports = function authServices({authUrl}) {
    assert.ok(_.isString(authUrl), `services-auth: "authUrl" is required!`);

    return ({services, sockets}) => {
        _.each(sockets, socketHandlers => {
            socketHandlers.forEach(socketHandler => {
                if (socketHandler.accessLevel) {
                    socketHandler.middleware.unshift(restrictSocket(authUrl), socketEnsureAuthorized);
                }
            });
        });

        _.each(services, routes => {
            routes.forEach(route => {
                if (route.accessLevel) {
                    route.middleware.unshift(restrictRoute(route, authUrl), routeEnsureAuthorized(route));
                }
            });
        });
    }
};
