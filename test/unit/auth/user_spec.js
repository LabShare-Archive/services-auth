'use strict';

const nock = require('nock');

describe('Auth User', () => {

    let authUser,
        authUrl,
        request,
        token;

    beforeEach(() => {
        token = 'a token';
        authUrl = 'https://a.labshare.org/_api/auth/me';
        request = nock('https://a.labshare.org').get('/_api/auth/me');
        authUser = require('../../../lib/user');
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('throws with invalid arguments', () => {
        expect(() => {
            authUser(token, null);
        }).toThrow();
    });

    it('fails if the token is missing or empty', done => {
        authUser('', authUrl, error => {
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
            expect(request.req.headers['auth-token']).toBe(token);
            return userData;
        });

        authUser(token, authUrl, (error, data) => {
            expect(error).toBeNull();
            expect(data).toEqual(userData);
            done();
        });
    });

    it('fails if the auth response has an invalid format', done => {
        let userData = {
            username: null,
            email: 'notAnEmail'
        };

        request.reply(200, userData);

        authUser(token, authUrl, (error, data) => {
            expect(error.message).toContain('invalid');
            expect(data).toBeUndefined();
            done();
        });
    });

    it('fails if the response status is not 200', done => {
        request.reply(500, {});

        authUser(token, authUrl, (error, data) => {
            expect(error).toBe(500);
            expect(data).toBeUndefined();
            done();
        });
    });

});
