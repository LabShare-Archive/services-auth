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
module.exports = function (route, authUrl) {
    assert.ok(_.isObject(route), 'services-auth: restrict middleware requires a "route"');
    assert.ok(_.isString(authUrl), 'services-auth: restrict middleware requires an "authUrl"');

    return function restrictMiddleware(req, res, next) {
        let token = req.headers['auth-token'];

        // Don't process unauthenticated or already authenticated requests
        if (!token || req.user || !route.accessLevel) {
            next();
            return;
        }

        if (req.session && req.session.user) {
            req.user = req.session.user;
            next();
            return;
        }

        // Obtain user profile information using the JWT
        authUser(token, authUrl, (error, userData) => {
            if (error) {
                // User profile had an invalid format
                if (error.code === 'INVALID_RESPONSE') {
                    res.status(401);
                    res.send({error: error.message});
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
