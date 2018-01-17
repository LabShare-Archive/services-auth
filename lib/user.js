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
 * @param {String} authUrl - The remote LabShare Auth service's base url
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function authUser({authUrl}) {
    assert.ok(_.isString(authUrl), 'services-auth: authUser requires an "authUrl"');

    /**
     * @param {String} authToken - An authorization JWT token
     * @param {String} [refreshToken] - An authorization refresh token
     */
    return ({authToken = '', refreshToken = ''}, callback) => {
        assert.ok(_.isFunction(callback), '`callback` must be a function');

        if (!authToken) {
            callback(new Error('authToken is required'));
            return;
        }

        const reqMsg = {
                headers: {
                    'auth-token': authToken,
                    'refresh-token': refreshToken
                }
            },
            profileUrl = authUrl + '/auth/me';

        rest.get(profileUrl, reqMsg).on('complete', (data, response) => {
            if (_.isError(data)) {
                return callback(data, null);
            }

            if (response.statusCode === 200) {
                let validation = validateProfile(data),
                    message = 'User profile is invalid: ';

                if (!validation.valid) {
                    validation.errors.forEach(error => {
                        message += `${error.property} ${error.message}. `;
                    });

                    let validationError = new Error(`${message}\n${JSON.stringify(data, null, 2)}`);
                    validationError.type = 'InvalidProfileError';

                    callback(validationError);
                    return;
                }

                callback(null, data);
                return;
            }

            callback(response.statusCode);
        });
    };
};
