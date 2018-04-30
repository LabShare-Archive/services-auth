'use strict';

const express = require('express'),
    restrict = require('../../../lib/restrict-route'),
    cookieParser = require('cookie-parser'),
    supertest = require('supertest');

describe('restrict', () => {

    const authToken = 'asca3obt20tb302tbwktblwekblqtbeltq';

    let authUserMock,
        route,
        app,
        request,
        successMiddleware,
        userData;

    beforeEach(() => {
        route = {
            accessLevel: 'admin'
        };
        userData = {
            username: 'smithm',
            email: 'email@example.com'
        };
        authUserMock = jasmine.createSpy('authUser');

        successMiddleware = (req, res) => {
            res.sendStatus(200);
        };

        app = express();
        app.use(cookieParser());
        request = supertest(app);
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            restrict({route: null, getUser: null});
        }).toThrow();

        expect(() => {
            restrict({route: null, getUser: authUserMock});
        }).toThrow();
    });

    describe('when the route is authenticated', () => {

        beforeEach(() => {
            authUserMock.and.callFake(({authToken}, cb) => {
                cb(null, userData);
            });
        });

        it('uses an auth token cookie if it exists', done => {
            app.get('/test', restrict({route, getUser: authUserMock}), successMiddleware);

            request
                .get('/test')
                .set('Cookie', `authToken=${authToken}`)
                .then(() => {
                    expect(authUserMock).toHaveBeenCalledWith({authToken}, jasmine.any(Function));
                    done();
                }).catch(done.fail);
        });

        it('responds with an error status if user authentication fails', done => {
            authUserMock.and.callFake(({}, cb) => {
                cb(new Error('auth error'));
            });

            app.get('/test', restrict({route, getUser: authUserMock}), successMiddleware);

            request
                .get('/test')
                .set('auth-token', authToken)
                .expect(401, done);
        });

        it('fails if there was an invalid response', done => {
            let authError = new Error('invalid response');
            authError.type = 'InvalidProfileError';

            authUserMock.and.callFake(({}, cb) => {
                cb(authError);
            });

            app.get('/test', restrict({route, getUser: authUserMock}), successMiddleware);

            request
                .get('/test')
                .set('auth-token', authToken)
                .expect(401)
                .then(data => {
                    expect(data.body.error).toBe('invalid response');
                    done();
                })
                .catch(done.fail);
        });

    });

    describe('when the route is not authenticated', () => {

        it('does not authenticate if the headers do not contain an auth token', done => {
            route.accessLevel = 'admin';

            app.get('/test', restrict({route, getUser: authUserMock}), successMiddleware);

            request
                .get('/test')
                .expect(200)
                .then(() => {
                    expect(authUserMock).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });

        it('does not authenticate if the route does not have an accessLevel check', done => {
            route.accessLevel = undefined;

            app.get('/test', restrict({route, getUser: authUserMock}), successMiddleware);

            request
                .get('/test')
                .set('auth-token', authToken)
                .expect(200)
                .then(() => {
                    expect(authUserMock).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });

    });

});
