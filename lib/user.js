'use strict';

const rest = require('restler'),
    _ = require('lodash'),
    assert = require('assert'),
    revalidator = require('revalidator');

function validateAuth(authInfo) {
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

    return revalidator.validate(authInfo, constraints);
}

/**
 * @description Authenticates a user with the LabShare API
 * @param {String} token - A JWT
 * @param {String} authUrl - The authentication endpoint used to obtain the user's role
 * @param {Function} callback
 */
module.exports = function authUser(token, authUrl, callback) {
    let reqMsg;

    assert.ok(_.isFunction(callback), '`callback` must be a function');

    if (!token) {
        callback(new Error('Invalid token'));
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
            var validation = validateAuth(data),
                message = 'User auth response is invalid: ';

            if (!validation.valid) {
                validation.errors.forEach(error => {
                    message += `${error.property} ${error.message}. `;
                });

                let validationError = new Error(`${message}\n${JSON.stringify(data, null, 2)}`);
                validationError.code = 'INVALID_RESPONSE';

                return callback(validationError);
            }
            return callback(null, data);
        }

        callback(response.statusCode);
    });
};
