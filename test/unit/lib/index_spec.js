'use strict';

const express = require('express'),
    portfinder = require('portfinder'),
    clientio = require('socket.io-client'),
    supertest = require('supertest'),
    {Services} = require('@labshare/services'),
    {pem2jwk} = require('pem-jwk'),
    servicesAuth = require('../../../lib/index'),
    jws = require('jsonwebtoken'),
    http = require('http'),
    selfsigned = require('selfsigned');

function getRole(authToken) {
    switch (jws.decode(authToken).sub) {
        case 1:
            return 'user';
        case 2:
            return 'staff';
        case 3:
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

    const packagesPath = './test/fixtures/main-package',
        apiPackage1Prefix = '/socket-api-package-1-namespace',
        organization = 'ls',
        certificates = selfsigned.generate([
            {
                name: 'commonName',
                value: 'labshare.org'
            }
        ], {
            days: 365
        });

    let authServerUrl,
        authServer,
        authServerPort,
        app;

    function createToken(sub, scope = '') {
        return jws.sign({
            sub,
            jti: 123456,
            azp: 123,
            audience: [],
            scope
        }, certificates.private, {
            algorithm: 'RS256',
            expiresIn: '10m',
            issuer: 'issuer',
            keyid: '1'
        });
    }

    beforeEach(done => {
        app = express();

        app.get('/auth/me', (req, res) => {
            const authToken = req.headers['auth-token'];

            res.json(getProfile(authToken));
        });

        // Create a JSON Web Key from the PEM
        const jwk = pem2jwk(certificates.private);

        // Azure AD checks for the 'use' and 'kid' properties
        jwk.kid = '1';
        jwk.use = 'sig';

        app.get(`/auth/${organization}/.well-known/jwks.json`, (req, res) => {
            res.json({
                keys: [
                    jwk
                ]
            });
        });

        portfinder.getPort((err, unusedPort) => {
            if (err) {
                done.fail(err);
                return;
            }

            authServerPort = unusedPort;
            authServerUrl = `http://localhost:${authServerPort}`;
            authServer = http.createServer(app).listen(unusedPort);

            done();
        });
    });

    afterEach(done => {
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
            const loggerMock = jasmine.createSpyObj('logger', ['error', 'info', 'warn']);

            portfinder.getPort((err, unusedPort) => {
                if (err) {
                    done.fail(err);
                    return;
                }

                port = unusedPort;
                socketAPIUrl = `http://localhost:${unusedPort}${apiPackage1Prefix}`;

                services = new Services({
                    listen: {
                        port: unusedPort
                    },
                    logger: loggerMock,
                    main: packagesPath,
                    morgan: {
                        enable: false
                    },
                    socket: {
                        connections: []
                    }

                });

                done();
            });
        });

        afterEach(done => {
            clientSocket.disconnect();
            servicesServer.close(done);
        });

        describe('when authorizing with Resource Scopes', () => {

            beforeEach(() => {
                services.config(servicesAuth({
                    authUrl: authServerUrl,
                    organization: 'ls'
                }));

                servicesServer = services.start();

                request = supertest(servicesServer);
                clientSocket = clientio.connect(socketAPIUrl);
            });

            it('allows users with the appropriate scopes', done => {
                const token = createToken(1, 'read:books');

                request.get('/api-package-1-namespace/books')
                    .set('auth-token', token)
                    .expect('got books')
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('blocks users without the appropriate scopes', done => {
                const token = createToken(1, 'read:books');

                request.post('/api-package-1-namespace/books')
                    .set('auth-token', token)
                    .expect(401)
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('checks if the user is authorized with socket messages', done => {
                const token = createToken(1, 'read:books');

                clientSocket.emit('read.books', {token}, (error, result) => {
                    if (error) {
                        done.fail(error);
                        return;
                    }

                    expect(result).toBe('got books');

                    done();
                });
            });

            it('blocks socket messages without the appropriate scope', done => {
                const token = createToken(1);

                clientSocket.emit('write.books', {token}, (error, message) => {
                    expect(message).toBeUndefined();
                    expect(error.message).toBe('Unauthorized');
                    expect(error.data.code).toBe(401);

                    done();
                });
            });

        });

        describe('with legacy access level check', () => {

            beforeEach(() => {
                services.config(servicesAuth({
                    authUrl: authServerUrl,
                    organization: 'ls'
                }));

                servicesServer = services.start();

                request = supertest(servicesServer);
                clientSocket = clientio.connect(socketAPIUrl);
            });

            it('allows users with the appropriate role', done => {
                const token = createToken(2);

                request.get('/api-package-1-namespace/staff/task')
                    .set('auth-token', token)
                    .expect('staff task complete')
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('blocks users without sufficient privileges', done => {
                const token = createToken(1);

                request.get('/api-package-1-namespace/admin/task')
                    .set('auth-token', token)
                    .expect(403)
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('checks if the user is authorized with socket messages', done => {
                const token = createToken(2);

                clientSocket.emit('staff.task', {token}, (error, result) => {
                    if (error) {
                        done.fail(error);
                        return;
                    }

                    expect(result).toBe('staff task complete');

                    done();
                });
            });

            it('fails to authorize user if they do not have the appropriate role', done => {
                const token = createToken(1);

                clientSocket.emit('admin.task', {token}, (error, message) => {
                    expect(message).toBeUndefined();
                    expect(error.message).toBe('Forbidden');
                    expect(error.data.code).toBe(403);
                    done();
                });
            });

            it('allows complex interactions such as role-based channel notifications', done => {
                const clientA = clientio.connect(socketAPIUrl),
                    clientB = clientio.connect(socketAPIUrl),
                    clientC = clientio.connect(socketAPIUrl),
                    clientD = clientio.connect(socketAPIUrl);

                const userToken = createToken(1);
                const staffToken = createToken(2);
                const adminToken = createToken(3);

                // Can't subscribe to notifications without the correct role
                clientB.emit('subscribe:notifications', {token: userToken}, error => {
                    expect(error.data.code).toBe(403);

                    clientB.disconnect();
                });

                clientD.emit('subscribe:notifications', {token: adminToken}, (error, message) => {
                    expect(message).toContain('Archived admin notification 1');
                });

                clientD.on('staff:notification', () => {
                    jasmine.fail('Admin user should not be in the staff channel!');
                });

                clientA.emit('subscribe:notifications', {token: staffToken}, (error, message) => {
                    expect(message).toContain('Archived notification 1');
                });

                clientA.on('staff:notification', message => {
                    expect(message).toContain('Something was processed by smithj');

                    clientA.disconnect();
                    clientC.disconnect();
                    clientD.disconnect();

                    done();
                });

                clientC.emit('subscribe:notifications', {token: staffToken}, (error, message) => {
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

});
