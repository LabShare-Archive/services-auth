'use strict';

const checkUserAuthorization = require('./check-user-authorization'),
    assert = require('assert'),
    _ = require('lodash');

/**
 * @description Role-based authorization middleware for LabShare HTTP APIs
 * @param {Object} route - A route definition
 */
module.exports = function ensureAuthorized(route) {
    assert.ok(_.isObject(route), '`route` must be an object');

    return function ensureRouteAuthorizedMiddleware(req, res, next) {
        let isAuthorized = checkUserAuthorization(req.user, route.accessLevel);

        if (!isAuthorized) {
            res.sendStatus(403);
            return;
        }

        next();
    };
};
