'use strict';

/**
 * @description Parses Authorization Bearer token from the request headers
 * @param req
 * @returns {string|*}
 */
module.exports = function getAuthorizationBearerToken(req) {
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

    return authToken || req.headers['auth-token'] || '';
};
