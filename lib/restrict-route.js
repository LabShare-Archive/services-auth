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

        let authToken = req.headers['auth-token'] || req.cookies.authToken || '',
            refreshToken = req.headers['refresh-token'] || req.cookies.refreshToken || '';

        // Don't process unauthenticated or already authenticated requests
        if (!authToken || req.user || !route.accessLevel || route.accessLevel === 'public') {
            next();
            return;
        }

        if (req.session && req.session.user) {
            req.user = req.session.user;
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

            if (req.session) {
                req.session.user = userData;
            }

            req.user = userData;

            next();
        });
    };
};
