/**
 * @exports Request authentication middleware
 */

'use strict';

const assert = require('assert'),
    _ = require('lodash');

/**
 * @description After successfully authenticating the user,
 * the user data is stored in the request.  If there was an error
 * authenticating the user, it responds with an error status.
 * @param {Object} route - A LabShare Service route
 * @param {Function} getUser - Function that retrieves the user data
 * @returns {Function} authorization middleware
 */
module.exports = function restrictRoute({route, getUser}) {
    assert.ok(_.isObject(route), 'services-auth: restrict middleware requires a "route"');

    return function restrictMiddleware(req, res, next) {
        assert.ok(_.isObject(req.cookies), 'cookie-parser middleware is required!');

        let authToken = '';

        // Backwards compatibility for "Authorization: Bearer [Token]" header format
        if (req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');

            if (parts.length === 2) {
                const scheme = parts[0],
                    credentials = parts[1];

                if (/^Bearer$/i.test(scheme)) {
                    authToken = credentials;
                }
            }
        }

        authToken = authToken || req.headers['auth-token'] || req.cookies.authToken || '';

        const refreshToken = req.headers['refresh-token'] || req.cookies.refreshToken || '';

        // Don't process unauthenticated or already authenticated requests
        if (!authToken || req.user || !route.accessLevel || route.accessLevel === 'public') {
            next();
            return;
        }

        // Obtain user profile information using the JWT
        getUser({authToken, refreshToken}, (error, userData) => {
            if (error) {
                // User profile had an invalid format
                if (error.type === 'InvalidProfileError') {
                    res.status(401).send({error: error.message});
                    return;
                }

                res.sendStatus(401);
                return;
            }

            req.user = userData;

            next();
        });
    };
};
