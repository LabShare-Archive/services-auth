'use strict';

const rest = require('restler'),
    _ = require('lodash'),
    assert = require('assert'),
    revalidator = require('revalidator');

function validateProfile(profile) {
    let constraints = {
        properties: {
            email: {
                description: 'The user\'s email address',
                type: 'string',
                format: 'email',
                required: true
            },
            username: {
                description: 'The user\'s login name',
                type: 'string',
                required: true
            }
        }
    };

    return revalidator.validate(profile, constraints);
}

/**
 * @description Authenticates a user with the LabShare API
 * @param {String} token - A JWT
 * @param {String} authUrl - The authentication endpoint used to obtain the user's role
 * @param {Function} callback
 */
module.exports = function authUser(token, authUrl, callback) {
    assert.ok(_.isFunction(callback), '`callback` must be a function');

    let reqMsg;

    if (!token) {
        callback(new Error('Token is required'));
        return;
    }
    
    reqMsg = {
        headers: {
            'auth-token': token
        }
    };

    rest.get(authUrl, reqMsg).on('complete', (data, response) => {
        if (_.isError(data)) {
            return callback(data);
        }

        if (response.statusCode === 200) {
            let validation = validateProfile(data),
                message = 'User profile is invalid: ';

            if (!validation.valid) {
                validation.errors.forEach(error => {
                    message += `${error.property} ${error.message}. `;
                });

                let validationError = new Error(`${message}\n${JSON.stringify(data, null, 2)}`);
                validationError.name = 'INVALID_PROFILE';

                return callback(validationError);
            }
            return callback(null, data);
        }

        callback(response.statusCode);
    });
};
