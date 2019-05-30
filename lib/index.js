"use strict";

const restrictRoute = require("./restrict-route");
const restrictSocket = require("./restrict-socket");
const authUser = require("./user");
const deprecate = require("deprecate");
const { each } = require("lodash");
const jwt = require("express-jwt");
const jwtAuthz = require("express-jwt-authz");
const jws = require("jsonwebtoken");
const socketRS256 = require("./socket/rs256");
const jwksClient = require("jwks-rsa");
const parseToken = require("parse-bearer-token").default;
const jwtAuthzSocket = require("./jwt-authz-socket");

const defaultJwksClientOptions = {
  cache: true,
  rateLimit: true, // See: https://github.com/auth0/node-jwks-rsa#rate-limiting
  jwksRequestsPerMinute: 10
};
const DEPRECATION_NOTICE = `LabShare API "accessLevel" authorization is deprecated. Please check https://github.com/LabShare/services-auth#usage for more info.`;

/**
 * @description Wrapper for express-jwt-authz middleware that passes over CORS OPTIONS requests
 * @param expectedScope
 * @returns {function(*=, *=, *=)}
 * @private
 */
function authorizeJWT(expectedScope) {
  return (req, res, next) => {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    jwtAuthz(expectedScope)(req, res, next);
  };
}

/**
 * @description Verify JWT audience
 * @param audience
 * @deprecated
 */
function restrictAudience(audience) {
  return (req, res, next) => {
    const token = parseToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = jws.decode(token);

    if (!audience || !decoded || !decoded.aud || !Array.isArray(decoded.aud)) {
      next();
      return;
    }

    if (decoded.aud.indexOf(audience) !== -1) {
      next();
      return;
    }

    res.sendStatus(401);
  };
}

/**
 * @description RS256 route authentication middleware for Express.js. It validates the Authorization Bearer token
 * request header.
 * @param {String} [authUrl] - The base URL for the LabShare Auth service. Optional if `secretProvider` is specified.
 * @param {String} [tenant] - A LabShare Auth Tenant. Optional if `secretProvider` is specified.
 * @param {String} [audience] - A unique identifier for the API service registered as a Resource Server in LabShare Auth
 * @param {String} [issuer] - Validate JWT issuer claim against the expected value
 * @param {Function|null} isRevokedCallback - Custom function to check if the JWT has been revoked. Function signature: (req, payload, cb: (error, boolean) => void);
 * @param {Function|null} secretProvider - Custom function for obtaining the RS256 signing certificate. Function signature: (req, header, payload, cb) => void.
 * @returns Express.js middleware function
 * @public
 */
function expressRs256({
  authUrl = null,
  tenant = null,
  secretProvider = null,
  audience = null,
  issuer = null,
  isRevokedCallback = null
}) {
  if (!authUrl && !secretProvider) {
    throw new Error("`authUrl` is required");
  }

  if (!tenant && !secretProvider) {
    throw new Error("`tenant` is required");
  }

  const jwksClientOptions = {
    ...defaultJwksClientOptions,
    jwksUri: `${authUrl}/auth/${tenant}/.well-known/jwks.json`
  };
  const secret =
    secretProvider || jwksClient.expressJwtSecret(jwksClientOptions);

  // Validate JWT in Authorization Bearer header using RS256
  return jwt({
    getToken: parseToken,
    secret,
    isRevoked: isRevokedCallback,
    audience, // Optionally validate the audience and the issuer as well
    issuer
  });
}

/**
 * @description Enables Resource Scope authorization on LabShare Service API routes and sockets using RS256 for JWT validation.
 * @param {String} [authUrl] - The base URL for the LabShare Auth service. Optional if `secretProvider` is specified.
 * @param {String} [tenant] - A LabShare Auth Tenant. Optional if `secretProvider` is specified.
 * @param {String} [audience] - A unique identifier for the API service registered as a Resource Server in LabShare Auth
 * @param {String} [issuer] - Validate JWT issuer claim against the expected value
 * @param {Function|null} isRevokedCallback - Custom function to check if the JWT has been revoked. Function signature: (req, payload, cb: (error, boolean) => void);
 * @param {Function|null} secretProvider - Custom function for obtaining the RS256 signing certificate. Function signature: (req, header, payload, cb).
 * @returns {function()} A LabShare Services configuration function that adds scope-based authentication middleware
 * to each socket and route definition.
 * @public
 */
function authorize({
  authUrl = null,
  tenant = null,
  secretProvider = null,
  audience = null,
  issuer = null,
  isRevokedCallback = null
}) {
  if (!authUrl && !secretProvider) {
    throw new Error("`authUrl` is required");
  }

  if (!tenant && !secretProvider) {
    throw new Error("`tenant` is required");
  }

  const getUser = authUser({ authUrl });
  const jwksClientOptions = {
    ...defaultJwksClientOptions,
    jwksUri: `${authUrl}/auth/${tenant}/.well-known/jwks.json`
  };

  // Attach authorization middleware to each non-public Socket.io event handler and Express HTTP route definition
  return ({ services, sockets }) => {
    each(sockets, socketHandlers => {
      socketHandlers.forEach(socketHandler => {
        // Validate JWT using RS256
        if (socketHandler.scope) {
          socketHandler.middleware.unshift(
            socketRS256({
              audience,
              issuer,
              jwksClientOptions
            }),
            jwtAuthzSocket(socketHandler.scope)
          );
        }

        // Legacy authentication check
        if (socketHandler.accessLevel) {
          deprecate(DEPRECATION_NOTICE);

          socketHandler.middleware.unshift(
            restrictSocket({ authUrl, getUser })
          );
        }
      });
    });

    each(services, routes => {
      routes.forEach(route => {
        // Validate JWT using RS256 and check Resource Scopes
        if (route.scope) {
          route.middleware.unshift((req, res, next) => {
            expressRs256({
              authUrl,
              tenant,
              secretProvider,
              audience,
              issuer,
              isRevokedCallback
            })(req, res, error => {
              if (error) {
                res.status(401).send(error.message);
                return;
              }

              next();
            });
          }, authorizeJWT(route.scope));
        }

        // Legacy authentication check
        if (route.accessLevel) {
          deprecate(DEPRECATION_NOTICE);

          route.middleware.unshift(
            restrictRoute({ route, authUrl, getUser }),
            restrictAudience(audience)
          );
        }
      });
    });
  };
}

module.exports = authorize;
module.exports.express = expressRs256;
