'use strict';

class UnauthorizedError extends Error {
    constructor(code, message) {
        super();
        this.message = message;
        this.data = {
            message: this.message,
            code,
            type: 'UnauthorizedError'
        };
    };
}

module.exports = UnauthorizedError;
