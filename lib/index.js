'use strict';

const routeEnsureAuthorized = require('./route-ensure-authorized'),
    socketEnsureAuthorized = require('./socket-ensure-authorized'),
    restrictRoute = require('./restrict-route'),
    restrictSocket = require('./restrict-socket'),
    authUser = require('./user'),
    _ = require('lodash');

/**
 * @description
 * @param {String} authUrl - The authentication endpoint used to obtain user profile information.
 * Optional if a `getUser` function is provided.
 * @param {Function|null} getUser - Custom function for obtaining the user data
 * @returns {function} A LabShare Services configuration function that adds role-based authentication middleware
 * to each socket and route definition.
 */
module.exports = function authServices({authUrl = null, getUser = null}) {
    getUser = getUser || authUser({authUrl});

    return ({services, sockets}) => {
        _.each(sockets, socketHandlers => {
            socketHandlers.forEach(socketHandler => {
                if (socketHandler.accessLevel) {
                    socketHandler.middleware.unshift(restrictSocket({authUrl, getUser}), socketEnsureAuthorized);
                }
            });
        });

        _.each(services, routes => {
            routes.forEach(route => {
                if (route.accessLevel) {
                    route.middleware.unshift(restrictRoute({route, authUrl, getUser}), routeEnsureAuthorized(route));
                }

                if (route.allowCORS) {
                    route.middleware.unshift(route.allowCORS);
                }
            });
        });
    }
};
