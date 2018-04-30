/**
 * @exports Request authentication middleware
 */

'use strict';

const assert = require('assert'),
    getBearerToken = require('./utils/get-bearer-token'),
    {isObject} = require('lodash');

/**
 * @description After successfully authenticating the user,
 * the user data is stored in the request.  If there was an error
 * authenticating the user, it responds with an error status.
 * @param {Object} route - A LabShare Service route
 * @param {Function} getUser - Function that retrieves the user data
 * @returns {Function} authorization middleware
 * @deprecated
 */
module.exports = function restrictRoute({route, getUser}) {
    assert.ok(isObject(route), 'services-auth: restrict middleware requires a "route"');

    return (req, res, next) => {
        assert.ok(isObject(req.cookies), 'cookie-parser middleware is required!');

        const authToken = getBearerToken(req);

        // Don't process unauthenticated or already authenticated requests
        if (!authToken || !route.accessLevel || route.accessLevel === 'public') {
            next();
            return;
        }

        // Obtain user profile information using the JWT
        getUser({authToken}, (error, userData) => {
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
