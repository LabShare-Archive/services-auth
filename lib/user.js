'use strict';

const request = require('request-promise'),
    {isString, isFunction} = require('lodash'),
    assert = require('assert'),
    revalidator = require('revalidator');

function validateProfile(profile) {
    const constraints = {
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
 * @returns {Function}
 */
module.exports = function authUser({authUrl}) {
    assert.ok(isString(authUrl), 'services-auth: authUser requires an "authUrl"');

    /**
     * @param {String} authToken - An authorization JWT token
     * @param {Function} callback
     */
    return ({authToken = ''}, callback) => {
        assert.ok(isFunction(callback), '`callback` must be a function');

        if (!authToken) {
            callback(new Error('Authorization Bearer token is required'));
            return;
        }

        const userProfileUrl = `${authUrl}/auth/me`;

        request.get({
            url: userProfileUrl,
            json: true,
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        }).then((data) => {
            const validation = validateProfile(data);

            let message = 'User profile is invalid: ';

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
        }).catch((error) => {
            callback(error);
        });
    };
};
