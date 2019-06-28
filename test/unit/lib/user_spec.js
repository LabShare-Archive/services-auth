'use strict';

const nock = require('nock'),
    authUser = require('../../../lib/user');

describe('Auth User', () => {

    const token = 'awefn9wf30qfnqpfnkqwfqpfn',
        authUrl = 'https://a.labshare.org/_api';

    let request;

    beforeEach(() => {
        request = nock('https://a.labshare.org').get('/_api/auth/me');
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            authUser({authUrl: null});
        }).toThrow();
    });

    it('fails if the token is missing or empty', done => {
        authUser({authUrl})({authToken: ''}, error => {
            expect(error.message).toMatch(/token is required/i);
            done();
        });
    });

    it('succeeds after successfully authenticating', done => {
        let userData = {
            username: 'smithm',
            email: 'email@example.com'
        };

        request.reply(200, () => {
            expect(request.req.headers.authorization).toBe('Bearer ' + token);
            return userData;
        });

        authUser({authUrl})({authToken: token}, (error, data) => {
            expect(error).toBeNull();
            expect(data).toEqual(userData);
            done();
        });
    });

    it('fails if the auth response has an invalid format', done => {
        const userData = {
            username: null,
            email: 'notAnEmail'
        };

        request.reply(200, userData);

        authUser({authUrl})({authToken: token}, (error, data) => {
            expect(error.message).toContain('invalid');
            expect(data).toBeUndefined();
            done();
        });
    });

    it('fails if the response status is not 200', done => {
        request.reply(500, {});

        authUser({authUrl})({authToken: token}, (error, data) => {
            expect(error.code).toBe(500);
            expect(data).toBeUndefined();
            done();
        });
    });

});
