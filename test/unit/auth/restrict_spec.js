'use strict';

const proxyquire = require('proxyquire'),
    express = require('express'),
    supertest = require('supertest-as-promised');

describe('restrict', () => {

    let restrict,
        authUserMock,
        authUrl,
        route,
        app,
        fakeAuthToken,
        request,
        successMiddleware,
        userData;

    beforeEach(() => {
        authUrl = 'https://some.auth.endpoint/auth/me';
        fakeAuthToken = 'asca3obt20tb302tbwktblwekblqtbeltq';
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
        request = supertest(app);

        restrict = proxyquire('../../../lib/restrict', {
            './user': authUserMock
        });
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            restrict(null, null);
        }).toThrow();

        expect(() => {
            restrict(fakeAuthToken, null);
        }).toThrow();

        expect(() => {
            restrict(null, authUrl);
        }).toThrow();
    });

    describe('when the route is authenticated', () => {

        it('stores the user data on the request and session if authentication succeeds', done => {
            authUserMock.and.callFake((token, authUrl, cb) => {
                cb(null, userData);
            });

            function addMockSession(req, res, next) {
                req.session = {};
                next();
            }

            function checkRequest(req, res) {
                expect(req.user).toEqual(userData);
                expect(req.session.user).toEqual(userData);

                res.sendStatus(200);
            }

            app.get('/test', addMockSession, restrict(route, authUrl), checkRequest);

            request
                .get('/test')
                .set('auth-token', fakeAuthToken)
                .then(() => {
                    expect(authUserMock).toHaveBeenCalledWith(fakeAuthToken, authUrl, jasmine.any(Function));
                    done();
                }).catch(done.fail);
        });

        it('responds with an error status if user authentication fails', done => {
            authUserMock.and.callFake((token, authUrl, cb) => {
                cb(new Error('auth error'));
            });

            app.get('/test', restrict(route, authUrl), successMiddleware);

            request
                .get('/test')
                .set('auth-token', fakeAuthToken)
                .expect(401, done);
        });

        it('fails if there was an invalid response', done => {
            let authError = new Error('invalid response');
            authError.code = 'INVALID_RESPONSE';

            authUserMock.and.callFake((token, authUrl, cb) => {
                cb(authError);
            });

            app.get('/test', restrict(route, authUrl), successMiddleware);

            request
                .get('/test')
                .set('auth-token', fakeAuthToken)
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

            app.get('/test', restrict(route, authUrl), successMiddleware);

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

            app.get('/test', restrict(route, authUrl), successMiddleware);

            request
                .get('/test')
                .set('auth-token', fakeAuthToken)
                .expect(200)
                .then(() => {
                    expect(authUserMock).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });

        it('does not authenticate if the user is already authenticated', done => {
            function auth(req, res, next) {
                req.user = {};
                next();
            }

            route.accessLevel = 'admin';

            app.get('/test', auth, restrict(route, authUrl), successMiddleware);

            request
                .get('/test')
                .set('auth-token', fakeAuthToken)
                .expect(200)
                .then(() => {
                    expect(authUserMock).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });

    });

});