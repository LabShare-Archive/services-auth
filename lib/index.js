'use strict';

const routeEnsureAuthorized = require('./route-ensure-authorized'),
    socketEnsureAuthorized = require('./socket-ensure-authorized'),
    restrictRoute = require('./restrict-route'),
    restrictSocket = require('./restrict-socket'),
    authUser = require('./user'),
    deprecate = require('deprecate'),
    _ = require('lodash'),
    jwt = require('express-jwt'),
    jwtAuthz = require('express-jwt-authz'),
    jwksClient = require('jwks-rsa');

/**
 * @description Wrapper for express-jwt-authz middleware that passes over CORS OPTIONS requests
 * @param expectedScope
 * @returns {function(*=, *=, *=)}
 * @private
 */
function authorizeJWT(expectedScope) {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            next();
            return;
        }

        jwtAuthz(expectedScope)(req, res, next);
    }
}

const DEPRECATION_NOTICE = `LabShare API "accessLevel" authorization is deprecated. Please check https://github.com/LabShare/services-auth#usage for more info.`;

/**
 * @description Enables Resource Scope authorization on LabShare Service API routes and sockets using RS256 for JWT validation.
 * @param {String} [authUrl] - The base URL for the LabShare Auth service. Optional if `getUser` is provided for legacy HS256 JWT validation strategy.
 * @param {String} [organization] - A LabShare Auth organization
 * @param {String} [audience] - A unique identifier for the API service registered as a Resource Server in LabShare Auth
 * @param {String} [issuer] - Validate JWT issuer claim against the expected value
 * @param {Function|null} getUser - Custom function for obtaining the user data
 * @param {Function|null} secretProvider - Custom function for obtaining the RS256 signing certificate. Function signature: (req, header, payload, cb).
 * @returns {function()} A LabShare Services configuration function that adds scope-based authentication middleware
 * to each socket and route definition.
 */
module.exports = function authorize({authUrl = null, getUser = null, secretProvider = null, organization, audience, issuer}) {
    getUser = getUser || authUser({authUrl});

    const client = jwksClient.expressJwtSecret({
        cache: true,
        rateLimit: true,   // See: https://github.com/auth0/node-jwks-rsa#rate-limiting
        jwksRequestsPerMinute: 10,
        jwksUri: `${authUrl}/auth/${organization}/.well-known/jwks.json`
    });

    // Attach authorization middleware to each non-public Socket.io event handler and Express HTTP route definition
    return ({services, sockets}) => {
        _.each(sockets, socketHandlers => {
            socketHandlers.forEach(socketHandler => {
                if (socketHandler.scope) {
                    socketHandler.middleware.unshift(
                        jwt({
                            secret: secretProvider || client,
                            audience,   // Optionally validate the audience and the issuer as well
                            issuer
                        }),
                        jwtAuthz(socketHandler.scope)
                    );
                }

                // Legacy access level check
                if (socketHandler.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    socketHandler.middleware.unshift(
                        restrictSocket({authUrl, getUser}),
                        socketEnsureAuthorized
                    );
                }
            });
        });

        _.each(services, routes => {
            routes.forEach(route => {
                if (route.scope) {
                    route.middleware.unshift(
                        jwt({
                            secret: secretProvider || client,
                            audience,
                            issuer
                        }),
                        authorizeJWT(route.scope)
                    );
                }

                // Legacy access level check
                if (route.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    route.middleware.unshift(
                        restrictRoute({route, authUrl, getUser}),
                        routeEnsureAuthorized(route)
                    );
                }
            });
        });
    }
};
