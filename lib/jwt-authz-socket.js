'use strict';

const UnauthorizedError = require('./unauthorized-error');

/**
 * @description Validate Resource Scopes assigned to Socket API.
 * Based on https://www.npmjs.com/package/express-jwt-authz
 * @param expectedScopes
 * @returns {function({socket: *, message: *}, *=)}
 * @private
 */
module.exports = function jwtAuthzSocket(expectedScopes = []) {
    function error(next) {
        next(new UnauthorizedError(401, 'Unauthorized'), null);
    }

    return ({socket, message}, next) => {
        if (expectedScopes.length === 0) {
            next(null, null);
            return;
        }

        if (!socket.user || typeof socket.user.scope !== 'string') {
            error(next);
            return;
        }

        const scopes = socket.user.scope.split(' '),
            allowed = expectedScopes.some((scope) => scopes.indexOf(scope) !== -1);

        return allowed ? next(null, null) : error(next)
    };
}