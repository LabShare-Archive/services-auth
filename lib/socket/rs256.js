'use strict';

const {verify, decode} = require('jsonwebtoken'),
    {get} = require('lodash'),
    jwksClient = require('jwks-rsa'),
    UnauthorizedError = require('../unauthorized-error');

/**
 * @description Validates Authorization Bearer Token using RS256 if it exists on the Socket message.
 * @param audience
 * @param issuer
 * @param jwksClientOptions
 * @returns {function(*=, *=, *=)}
 * @private
 */
module.exports = function socketRS256({audience, issuer, jwksClientOptions}) {
    return ({socket, message}, next) => {
        const token = get(message, 'token') || get(message, 'authToken');

        if (!token) {
            next(null, null);
            return;
        }

        const decodedToken = decode(token, {complete: true}) || {},
            client = jwksClient(jwksClientOptions),
            {header} = decodedToken;

        // Only RS256 is supported.
        if (!header || header.alg !== 'RS256') {
            next(new UnauthorizedError(401, 'Unauthorized'), null);
            return;
        }

        client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                socket.emit('unauthorized');
                next(new UnauthorizedError(401, 'Unauthorized'), null);
                return;
            }

            // Verify the JWT using the public certificate from the JWKS
            verify(token, key.publicKey || key.rsaPublicKey, {
                audience,
                issuer
            }, (error, decoded) => {
                if (error) {
                    socket.emit('unauthorized');
                    next(new UnauthorizedError(401, 'Unauthorized'), null);
                    return;
                }

                // Store the decoded Bearer Token on the socket
                socket.user = decoded;

                next(null, null);
            });
        });
    }
}