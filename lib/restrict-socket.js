/**
 * @exports Request authentication middleware
 */

'use strict';

const authUser = require('./user'),
    UnauthorizedError = require('./unauthorized-error'),
    assert = require('assert'),
    _ = require('lodash');

/**
 * @description After successfully authenticating the user,
 * the user data is stored in the request.  If there was an error
 * authenticating the user, it responds with an error status.
 * @param {String} authUrl - The full URL to the user profile authentication endpoint
 * @returns {Function} authorization middleware
 */
module.exports = function restrict(authUrl) {
    assert.ok(_.isString(authUrl), 'services-auth: restrictSocket middleware requires an "authUrl"');

    return function restrictMiddleware({socketHandler, socket, message}, next) {
        let authToken = _.get(message, 'token') || _.get(message, 'authToken'),
            refreshToken = _.get(message, 'refreshToken');

        // Don't process unauthenticated socket messages
        if (!authToken || !socketHandler.accessLevel || socketHandler.accessLevel === 'public') {
            next();
            return;
        }

        // Obtain user profile information using the JWT
        authUser({authToken, refreshToken, authUrl}, (error, userData) => {
            if (error) {
                // User profile had an invalid format
                if (error.type === 'InvalidProfileError') {
                    socket.emit('unauthorized');
                    next(new UnauthorizedError(401, 'invalid_profile'));
                    return;
                }
                socket.emit('unauthorized');
                next(new UnauthorizedError(401, 'Unauthorized'));
                return;
            }

            socket.user = userData;

            next();
        });
    };
};
