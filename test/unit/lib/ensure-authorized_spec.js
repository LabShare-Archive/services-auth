'use strict';

const proxyquire = require('proxyquire'),
    express = require('express'),
    supertest = require('supertest');

describe('ensureAuthorized', () => {

    let ensureAuthorized,
        route,
        user,
        app,
        fakeAuthToken,
        request,
        successMiddleware,
        userAuthMiddleware,
        userProfile;

    beforeEach(() => {
        fakeAuthToken = 'asca3obt20tb302tbwktblwekblqtbeltq';
        route = {
            accessLevel: 'admin'
        };
        userProfile = {
            role: 'admin'
        };

        successMiddleware = (req, res) => {
            res.sendStatus(200);
        };

        userAuthMiddleware = user => {
            return (req, res, next) => {
                req.user = user;
                next();
            };
        };

        app = express();
        request = supertest(app);

        ensureAuthorized = require('../../../lib/route-ensure-authorized');
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            ensureAuthorized(null);
        }).toThrow();
    });

    it('allows users to access routes that match their role', done => {
        route = {
            accessLevel: 'public'
        };
        user = {
            role: 'public'
        };

        app.get('/test', userAuthMiddleware(user), ensureAuthorized(route), successMiddleware);

        request
            .get('/test')
            .set('auth-token', fakeAuthToken)
            .expect(200, done);
    });

    it('prevents users from accessing routes that do not match their role', done => {
        route = {
            accessLevel: 'admin'
        };
        user = {
            role: 'public'
        };

        app.get('/test', userAuthMiddleware(user), ensureAuthorized(route), successMiddleware);

        request
            .get('/test')
            .set('auth-token', fakeAuthToken)
            .expect(403, done);
    });

    it('defaults to accessLevel "public" if a route does not define an "accessLevel"', done => {
        route = {};
        user = {
            role: 'user'
        };

        app.get('/test', userAuthMiddleware(user), ensureAuthorized(route), successMiddleware);

        request
            .get('/test')
            .set('auth-token', fakeAuthToken)
            .expect(200, done);
    });

});
