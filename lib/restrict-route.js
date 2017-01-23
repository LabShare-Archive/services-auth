/**
 * @exports Request authentication middleware
 */

'use strict';

const authUser = require('./user'),
    assert = require('assert'),
    _ = require('lodash');

/**
 * @description After successfully authenticating the user,
 * the user data is stored in the request.  If there was an error
 * authenticating the user, it responds with an error status.
 * @param {Object} route - A LabShare Service route
 * @param {String} authUrl - The full URL to the user profile authentication endpoint
 * @returns {Function} authorization middleware
 */
module.exports = function restrictRoute(route, authUrl) {
    assert.ok(_.isObject(route), 'services-auth: restrict middleware requires a "route"');
    assert.ok(_.isString(authUrl), 'services-auth: restrict middleware requires an "authUrl"');

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
        authUser({authToken, refreshToken, authUrl}, (error, userData) => {
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
