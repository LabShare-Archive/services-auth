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

function getUserName(authToken) {
    switch (jws.decode(authToken).sub) {
        case 1:
            return 'user';
        case 2:
            return 'staff';
        case 3:
            return 'admin';
        default:
            return 'smithj';
    }
}

function getProfile(authToken) {
    return {
        email: 'test@gmail.com',
        username: getUserName(authToken)
    };
}

describe('Services-Auth', () => {

    const packagesPath = './test/fixtures/main-package';
    const apiPackage1Prefix = '/socket-api-package-1-namespace';
    const tenant = 'ls';
    const defaultAudience = 'https://my.api.id/v2';
    const certificates = selfsigned.generate([
        {
            name: 'commonName',
            value: 'labshare.org'
        }
    ], {
        days: 365
    });

    let authServerUrl;
    let authServer;
    let authServerPort;
    let app;

    function createToken(sub, scope = '', audience = defaultAudience) {
        return jws.sign({
            sub,
            jti: 123456,
            azp: 123,
            scope
        }, certificates.private, {
            algorithm: 'RS256',
            expiresIn: '10m',
            issuer: 'issuer',
            keyid: '1',
            audience: [
                audience
            ]
        });
    }

    beforeEach(done => {
        app = express();

        app.get('/auth/me', (req, res) => {
            const authToken = req.headers.authorization.split(' ')[1];

            res.json(getProfile(authToken));
        });

        // Create a JSON Web Key from the PEM
        const jwk = pem2jwk(certificates.private);

        // Azure AD checks for the 'use' and 'kid' properties
        jwk.kid = '1';
        jwk.use = 'sig';

        app.get(`/auth/${tenant}/.well-known/jwks.json`, (req, res) => {
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

        let services;
        let request;
        let port;
        let socketAPIUrl;
        let clientSocket;
        let servicesServer;

        beforeEach(done => {
            const loggerMock = jasmine.createSpyObj('logger', ['error', 'info', 'warn']);

            portfinder.getPort((error, unusedPort) => {
                if (error) {
                    done.fail(error);
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
                    tenant,
                    audience: defaultAudience
                }));

                servicesServer = services.start();

                request = supertest(servicesServer);
                clientSocket = clientio.connect(socketAPIUrl);
            });

            it('allows users with the appropriate scopes', done => {
                const token = createToken(1, 'read:books');

                request.get('/api-package-1-namespace/books')
                    .set('Authorization', 'Bearer ' + token)
                    .expect('got books')
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('blocks users without the appropriate scopes', done => {
                const token = createToken(1, 'read:books');

                request.post('/api-package-1-namespace/books')
                    .set('Authorization', 'Bearer ' + token)
                    .expect(401)
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it('does not require authentication when the route is public', async () => {
                await request
                    .get('/api-package-1-namespace/public/task')
                    .expect('public task complete');
            });

            it('requires the audience claim to match', (done) => {
                const token = createToken(1, '', 'not-a-valid-audience');

                request.post('/api-package-1-namespace/books')
                    .set('Authorization', 'Bearer ' + token)
                    .expect(401)
                    .then(done)
                    .catch(done.fail);
            });

            it('requires an Authorization Bearer token in the request headers', (done) => {
                request.post('/api-package-1-namespace/books')
                    .expect(401)
                    .then((res) => {
                        expect(res.text).toBe('No authorization token was found');
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

        describe('with legacy authentication check', () => {

            beforeEach(() => {
                services.config(servicesAuth({
                    authUrl: authServerUrl,
                    tenant,
                    audience: defaultAudience
                }));

                servicesServer = services.start();

                request = supertest(servicesServer);
                clientSocket = clientio.connect(socketAPIUrl);
            });

            it('allows authenticated users', done => {
                const token = createToken(2);

                request.get('/api-package-1-namespace/staff/task')
                    .set('Authorization', 'Bearer ' + token)
                    .expect('staff task complete')
                    .then(() => {
                        done();
                    })
                    .catch(done.fail);
            });

            it(`fails if the audiences of the bearer token does not match any of the JWT's audiences`, (done) => {
                const token = createToken(2, '', 'not-a-valid-audience');

                request.get('/api-package-1-namespace/staff/task')
                    .set('Authorization', 'Bearer ' + token)
                    .expect(401)
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

            it('allows complex interactions such as id-based channel notifications', (done) => {
                const clientA = clientio.connect(socketAPIUrl);
                const clientB = clientio.connect(socketAPIUrl);
                const clientC = clientio.connect(socketAPIUrl);
                const clientD = clientio.connect(socketAPIUrl);

                const staffUserToken = createToken(2);
                const adminUserToken = createToken(3);

                // Can't subscribe to notifications without being authenticated
                clientB.emit('subscribe:notifications', {token: null}, error => {
                    expect(error.data.code).toBe(401);

                    clientB.disconnect();
                });

                clientD.emit('subscribe:notifications', {token: adminUserToken}, (error, message) => {
                    expect(error).toBeNull();
                    expect(message).toContain('Archived admin notification 1');
                });

                clientD.on('staff:notification', () => {
                    jasmine.fail('Admin user should not be in the staff channel!');
                });

                clientA.emit('subscribe:notifications', {token: staffUserToken}, (error, message) => {
                    expect(message).toContain('Archived notification 1');
                });

                clientA.on('staff:notification', (message) => {
                    expect(message).toContain('Something was processed by staff!');

                    clientA.disconnect();
                    clientC.disconnect();
                    clientD.disconnect();

                    done();
                });

                clientC.emit('subscribe:notifications', {token: staffUserToken}, (error, message) => {
                    expect(message).toContain('Archived notification 1');

                    // The resulting notification should be sent to everyone subscribed to the staff channel
                    clientC.emit('process:something', {token: staffUserToken}, (error, message) => {
                        expect(error).toBeNull();
                        expect(message).toContain('processing finished');
                    });
                });
            });

        });

    });

});
