/**
 * @exports Request authentication middleware
 */

'use strict';

const UnauthorizedError = require('./unauthorized-error'),
    {get} = require('lodash');

/**
 * @description After successfully authenticating the user,
 * the user data is stored in the request.  If there was an error
 * authenticating the user, it responds with an error status.
 * @param {Function} getUser - Function that retrieves the user data
 * @returns {Function} authorization middleware
 */
module.exports = function restrict({getUser}) {
    return ({socketHandler, socket, message}, next) => {
        const authToken = get(message, 'token') || get(message, 'authToken'),
            refreshToken = get(message, 'refreshToken');

        // Don't process unauthenticated socket messages
        if (!authToken || !socketHandler.accessLevel || socketHandler.accessLevel === 'public') {
            next();
            return;
        }

        // Obtain user profile information using the JWT
        getUser({authToken, refreshToken}, (error, userData) => {
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
