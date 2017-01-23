'use strict';

const checkUserAuthorization = require('./check-user-authorization'),
    UnauthorizedError = require('./unauthorized-error');

/**
 * @description Role-based authorization middleware
 */
module.exports = function socketEnsureAuthorized({socket, socketHandler}, next) {
    let isAuthorized = checkUserAuthorization(socket.user, socketHandler.accessLevel);

    if (!isAuthorized) {
        socket.emit('Unauthorized');
        next(new UnauthorizedError(403, 'Forbidden'));
        return;
    }

    next();
};
