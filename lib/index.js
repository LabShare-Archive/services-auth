'use strict';

const routeEnsureAuthorized = require('./route-ensure-authorized'),
    socketEnsureAuthorized = require('./socket-ensure-authorized'),
    restrictRoute = require('./restrict-route'),
    restrictSocket = require('./restrict-socket'),
    authUser = require('./user'),
    deprecate = require('deprecate'),
    {each} = require('lodash'),
    jwt = require('express-jwt'),
    jwtAuthz = require('express-jwt-authz'),
    socketRS256 = require('./socket/rs256'),
    jwksClient = require('jwks-rsa'),
    getBearerToken = require('./utils/get-bearer-token'),
    jwtAuthzSocket = require('./jwt-authz-socket');

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
 * @description Validate Authorization Bearer Token using RS256 if it exists as a request header.
 * @param secret
 * @param audience
 * @param issuer
 * @returns {function(*=, *=, *=)}
 * @private
 */
function httpRS256({secret, audience, issuer}) {
    return function rs256(req, res, next) {
        jwt({
            getToken: getBearerToken,
            secret,
            audience,   // Optionally validate the audience and the issuer as well
            issuer
        })(req, res, next);
    }
}

/**
 * @description Enables Resource Scope authorization on LabShare Service API routes and sockets using RS256 for JWT validation.
 * @param {String} authUrl - The base URL for the LabShare Auth service.
 * @param {String} organization - A LabShare Auth organization. Optional if `secretProvider` is specified.
 * @param {String} [audience] - A unique identifier for the API service registered as a Resource Server in LabShare Auth
 * @param {String} [issuer] - Validate JWT issuer claim against the expected value
 * @param {Function|null} secretProvider - Custom function for obtaining the RS256 signing certificate. Function signature: (req, header, payload, cb).
 * @returns {function()} A LabShare Services configuration function that adds scope-based authentication middleware
 * to each socket and route definition.
 * @public
 */
module.exports = function authorize({authUrl, organization, secretProvider = null, audience = null, issuer = null}) {
    if (!authUrl) {
        throw new Error('`authUrl` is required');
    }

    if (!organization && !secretProvider) {
        throw new Error('`organization` is required');
    }

    const getUser = authUser({authUrl}),
        jwksClientOptions = {
            cache: true,
            rateLimit: true,   // See: https://github.com/auth0/node-jwks-rsa#rate-limiting
            jwksRequestsPerMinute: 10,
            jwksUri: `${authUrl}/auth/${organization}/.well-known/jwks.json`
        },
        defaultSecretProvider = jwksClient.expressJwtSecret(jwksClientOptions);

    // Attach authorization middleware to each non-public Socket.io event handler and Express HTTP route definition
    return ({services, sockets}) => {
        each(sockets, socketHandlers => {
            socketHandlers.forEach(socketHandler => {
                let middleware = [];

                // Validate JWT using RS256
                if (socketHandler.scope || socketHandler.accessLevel) {
                    middleware.push(
                        socketRS256({
                            audience,
                            issuer,
                            jwksClientOptions
                        })
                    );
                }

                if (socketHandler.scope) {
                    middleware.push(
                        jwtAuthzSocket(socketHandler.scope)
                    );
                }

                // Legacy access level check
                if (socketHandler.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    middleware.push(
                        restrictSocket({authUrl, getUser}),
                        socketEnsureAuthorized
                    );
                }

                socketHandler.middleware.unshift(...middleware);
            });
        });

        each(services, routes => {
            routes.forEach(route => {
                let middleware = [];

                // Validate JWT using RS256
                if (route.scope || route.accessLevel) {
                    middleware.push(
                        httpRS256({
                            secret: secretProvider || defaultSecretProvider,
                            audience,
                            issuer
                        })
                    );
                }

                // If scope, check scope
                if (route.scope) {
                    middleware.push(
                        authorizeJWT(route.scope)
                    );
                }

                // Legacy access level check
                if (route.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    middleware.push(
                        restrictRoute({route, authUrl, getUser}),
                        routeEnsureAuthorized(route)
                    );
                }

                route.middleware.unshift(...middleware);
            });
        });
    }
};
