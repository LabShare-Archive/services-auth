'use strict';

const restrictRoute = require('./restrict-route'),
    restrictSocket = require('./restrict-socket'),
    authUser = require('./user'),
    deprecate = require('deprecate'),
    {each} = require('lodash'),
    jwt = require('express-jwt'),
    jwtAuthz = require('express-jwt-authz'),
    jws = require('jsonwebtoken'),
    socketRS256 = require('./socket/rs256'),
    jwksClient = require('jwks-rsa'),
    getBearerToken = require('./utils/get-bearer-token'),
    jwtAuthzSocket = require('./jwt-authz-socket');

const DEPRECATION_NOTICE = `LabShare API "accessLevel" authorization is deprecated. Please check https://github.com/LabShare/services-auth#usage for more info.`;

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
        })(req, res, (error) => {
            if (error) {
                res.status(401).send(error.message);
                return;
            }

            next();
        });
    }
}

/**
 * @description Verify JWT audience
 * @param audience
 * @deprecated
 */
function restrictAudience(audience) {
    return (req, res, next) => {
        const token = getBearerToken(req);

        if (!token) {
            next();
            return;
        }

        const decoded = jws.decode(token);

        if (!audience || !decoded || !decoded.aud || !Array.isArray(decoded.aud)) {
            next();
            return;
        }

        if (decoded.aud.indexOf(audience) !== -1) {
            next();
            return;
        }

        res.sendStatus(401);
    }
}

/**
 * @description Enables Resource Scope authorization on LabShare Service API routes and sockets using RS256 for JWT validation.
 * @param {String} authUrl - The base URL for the LabShare Auth service.
 * @param {String} tenant - A LabShare Auth Tenant. Optional if `secretProvider` is specified.
 * @param {String} [audience] - A unique identifier for the API service registered as a Resource Server in LabShare Auth
 * @param {String} [issuer] - Validate JWT issuer claim against the expected value
 * @param {Function|null} secretProvider - Custom function for obtaining the RS256 signing certificate. Function signature: (req, header, payload, cb).
 * @returns {function()} A LabShare Services configuration function that adds scope-based authentication middleware
 * to each socket and route definition.
 * @public
 */
module.exports = function authorize({authUrl, tenant, secretProvider = null, audience = null, issuer = null}) {
    if (!authUrl) {
        throw new Error('`authUrl` is required');
    }

    if (!tenant && !secretProvider) {
        throw new Error('`tenant` is required');
    }

    const getUser = authUser({authUrl}),
        jwksClientOptions = {
            cache: true,
            rateLimit: true,   // See: https://github.com/auth0/node-jwks-rsa#rate-limiting
            jwksRequestsPerMinute: 10,
            jwksUri: `${authUrl}/auth/${tenant}/.well-known/jwks.json`
        },
        defaultSecretProvider = jwksClient.expressJwtSecret(jwksClientOptions);

    // Attach authorization middleware to each non-public Socket.io event handler and Express HTTP route definition
    return ({services, sockets}) => {
        each(sockets, socketHandlers => {
            socketHandlers.forEach(socketHandler => {
                // Validate JWT using RS256
                if (socketHandler.scope) {
                    socketHandler.middleware.unshift(
                        socketRS256({
                            audience,
                            issuer,
                            jwksClientOptions
                        }),
                        jwtAuthzSocket(socketHandler.scope)
                    );
                }

                // Legacy authentication check
                if (socketHandler.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    socketHandler.middleware.unshift(
                        restrictSocket({authUrl, getUser})
                    );
                }
            });
        });

        each(services, routes => {
            routes.forEach(route => {
                // Validate JWT using RS256 and check Resource Scopes
                if (route.scope) {
                    route.middleware.unshift(
                        httpRS256({
                            secret: secretProvider || defaultSecretProvider,
                            audience,
                            issuer
                        }),
                        authorizeJWT(route.scope)
                    );
                }

                // Legacy authentication check
                if (route.accessLevel) {
                    deprecate(DEPRECATION_NOTICE);

                    route.middleware.unshift(
                        restrictRoute({route, authUrl, getUser}),
                        restrictAudience(audience)
                    );
                }
            });
        });
    }
};
