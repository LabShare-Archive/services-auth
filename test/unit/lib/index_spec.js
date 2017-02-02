'use strict';

const express = require('express'),
    portfinder = require('portfinder'),
    clientio = require('socket.io-client'),
    supertest = require('supertest'),
    {Services} = require('@labshare/services'),
    http = require('http');

function getRole(authToken) {
    switch (authToken) {
        case 'user-token':
            return 'user';
        case 'staff-token':
            return 'staff';
        case 'admin-token':
            return 'admin';
        default:
            return {};
    }
}

function getProfile(authToken) {
    let role = getRole(authToken);

    return {
        role,
        email: 'test@gmail.com',
        username: 'smithj'
    };
}

describe('Services-Auth', () => {

    let servicesAuth,
        authServerUrl,
        authServer,
        packagesPath,
        apiPackage1Prefix,
        authServerPort,
        app;

    beforeEach(done => {
        packagesPath = './test/fixtures/main-package';
        apiPackage1Prefix = '/socket-api-package-1-namespace';
        app = express();

        app.get('/auth/me', (req, res) => {
            let authToken = req.headers['auth-token'];

            res.json(getProfile(authToken));
        });

        portfinder.getPort((err, unusedPort) => {
            if (err) {
                done.fail(err);
                return;
            }

            authServerPort = unusedPort;
            authServerUrl = `http://localhost:${authServerPort}/auth/me`;
            authServer = http.createServer(app).listen(unusedPort);
            done();
        });
    });

    afterEach(done => {
        delete global.LabShare;
        authServer.close(done);
    });

    describe('when authorizing users', () => {

        let services,
            request,
            port,
            socketAPIUrl,
            clientSocket,
            servicesServer;

        beforeEach(done => {
            let loggerMock = jasmine.createSpyObj('logger', ['error', 'info', 'warn']);

            portfinder.getPort((err, unusedPort) => {
                if (err) {
                    done.fail(err);
                    return;
                }

                port = unusedPort;
                socketAPIUrl = `http://localhost:${unusedPort}${apiPackage1Prefix}`;

                // TODO: temporary until options for Services are fixed
                global.LabShare = {
                    Config: {
                        services: {
                            Listen: {
                                Port: unusedPort
                            }
                        }
                    }
                };

                services = new Services({
                    logger: loggerMock,
                    main: packagesPath,
                    morgan: {
                        enable: false
                    },
                    socket:{
                        connections: []
                    }

                });

                servicesAuth = require('../../../lib/index');

                services.config(servicesAuth({
                    authUrl: authServerUrl
                }));

                servicesServer = services.start();

                request = supertest(servicesServer);
                clientSocket = clientio.connect(socketAPIUrl);

                done();
            });
        });

        afterEach(done => {
            clientSocket.disconnect();
            servicesServer.close(done);
        });

        it('allows users with the appropriate role', done => {
            request.get('/api-package-1-namespace/staff/task')
                .set('auth-token', 'staff-token')
                .expect('staff task complete')
                .then(() => {
                    done();
                })
                .catch(done.fail);
        });

        it('blocks users without sufficient privileges', done => {
            request.get('/api-package-1-namespace/admin/task')
                .set('auth-token', 'user-token')
                .expect(403)
                .then(() => {
                    done();
                })
                .catch(done.fail);
        });

        it('checks if the user is authorized with socket messages', done => {
            clientSocket.emit('staff.task', {token: 'staff-token'}, (error, result) => {
                expect(error).toBeNull();
                expect(result).toBe('staff task complete');
                done();
            });
        });

        it('fails to authorize user if they do not have the appropriate role', done => {
            clientSocket.emit('admin.task', {token: 'user-token'}, (error, message) => {
                expect(message).toBeUndefined();
                expect(error.message).toBe('Forbidden');
                expect(error.data.code).toBe(403);
                done();
            });
        });

        it('allows complex interactions such as role-based channel notifications', done => {
            let clientA = clientio.connect(socketAPIUrl),
                clientB = clientio.connect(socketAPIUrl),
                clientC = clientio.connect(socketAPIUrl),
                clientD = clientio.connect(socketAPIUrl);

            // Can't subscribe to notifications without the correct role
            clientB.emit('subscribe:notifications', {token: 'user-token'}, error => {
                expect(error.data.code).toBe(403);

                clientB.disconnect();
            });

            clientD.emit('subscribe:notifications', {token: 'admin-token'}, (error, message) => {
                expect(message).toContain('Archived admin notification 1');
            });

            clientD.on('staff:notification', () => {
                jasmine.fail('Admin user should not be in the staff channel!');
            });

            clientA.emit('subscribe:notifications', {token: 'staff-token'}, (error, message) => {
                expect(message).toContain('Archived notification 1');
            });

            clientA.on('staff:notification', message => {
                expect(message).toContain('Something was processed by smithj');

                clientA.disconnect();
                clientC.disconnect();
                clientD.disconnect();

                done();
            });

            clientC.emit('subscribe:notifications', {token: 'staff-token'}, (error, message) => {
                expect(message).toContain('Archived notification 1');

                // The resulting notification should be sent to everyone subscribed to the staff channel
                clientC.emit('process:something', (error, message) => {
                    expect(error).toBeNull();
                    expect(message).toContain('processing finished');
                });
            });
        });

    });

});
