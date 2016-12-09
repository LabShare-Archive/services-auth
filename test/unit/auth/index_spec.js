'use strict';

const proxyquire = require('proxyquire'),
    express = require('express'),
    supertest = require('supertest-as-promised'),
    _ = require('lodash');

describe('Services Auth Plugin', () => {

    let servicesAuth,
        authUrl,
        app,
        request,
        successMiddleware,
        restrictStub,
        ensureAuthorizedStub;

    beforeEach(() => {
        authUrl = 'auth url';
        ensureAuthorizedStub = jasmine.createSpy('ensureAuthorized');
        restrictStub = jasmine.createSpy('restrictStub');

        successMiddleware = (req, res) => {
            res.sendStatus(200);
        };

        app = express();
        request = supertest(app);

        servicesAuth = proxyquire('../../../lib/index', {
            './restrict': restrictStub,
            './ensure-authorized': ensureAuthorizedStub
        });
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            servicesAuth(null);
        }).toThrow();
    });

    it('adds auth middleware to each route exported by LabShare Services', done => {
        let configFunction = servicesAuth({authUrl}),
            ensureAuthorizedTracker = jasmine.createSpy('ensureAuthorized'),
            restrictTracker = jasmine.createSpy('restrict');

        ensureAuthorizedStub.and.callFake(() => {
            return (req, res, next) => {
                ensureAuthorizedTracker();
                next();
            }
        });
        restrictStub.and.callFake(() => {
            return (req, res, next) => {
                restrictTracker();
                next();
            }
        });

        let services = {
            package1: [
                {
                    path: '/test/1',
                    middleware: [successMiddleware],
                    accessLevel: 'user'
                },
                {
                    path: '/test/2',
                    middleware: [successMiddleware]
                }
            ],
            package2: [
                {
                    path: '/test/3',
                    middleware: [successMiddleware],
                    accessLevel: 'admin'
                }
            ]
        };

        configFunction({services});

        _.each(services, routes => {
            routes.forEach(route => {
                app.get(route.path, ...route.middleware);
            });
        });

        request.get('/test/1').expect(200)
            .then(() => {
                expect(ensureAuthorizedTracker.calls.count()).toBe(1);
                expect(restrictTracker.calls.count()).toBe(1);

                return request.get('/test/2').expect(200)
            })
            .then(() => {
                // /test/2 is not authenticated, so the middleware should not be attached or called
                expect(ensureAuthorizedTracker.calls.count()).toBe(1);
                expect(restrictTracker.calls.count()).toBe(1);

                return request.get('/test/3').expect(200)
            })
            .then(() => {
                expect(ensureAuthorizedTracker.calls.count()).toBe(2);
                expect(restrictTracker.calls.count()).toBe(2);
                done();
            })
            .catch(done.fail);
    });

});
