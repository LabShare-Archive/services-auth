'use strict';

const {userRoles, accessLevels} = require('./user-roles'),
    _ = require('lodash');

/**
 * @description Checks if the user's role is acceptable for the given access level requirement
 * @param {Object} user
 * @param {String} accessLevel - A role based access level such as 'staff' or 'admin'
 * @returns {boolean}
 */
module.exports = function checkUserAuthorization(user, accessLevel) {
    let role;

    if (!user || !user.role) {
        role = userRoles.public;
    } else {
        role = user.role;
        if (_.isString(role)) {
            role = userRoles[user.role];
        }
    }

    const userAccessLevel = accessLevels[accessLevel] || accessLevels.public;

    return !!(userAccessLevel.bitMask & role.bitMask);
};
