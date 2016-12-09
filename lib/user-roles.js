(function (exports) {
    var config = {

        // There is a max of 31 roles before the bit shift pushes the accompanying integer out of
        // the memory footprint for an integer
        roles: [
            'public',
            'user',
            'staff',
            'admin'
        ],

        // Build all the access levels you want referencing the roles listed above.
        // An asterisk represents access to all roles.
        accessLevels: {
            'public': "*",
            'anon': ['public'],
            'user': ['user', 'staff', 'admin'],
            'staff': ['staff', 'admin'],
            'admin': ['admin']
        }
    };

    /**
     * @description Builds a distinct bit mask for each role. It starts off with "1"
     * and shifts the bit to the left for each element in the given roles array.
     * @param {Array} roles
     * @returns {Object}
     */
    function buildRoles(roles) {
        var bitMask = "01";
        var userRoles = {};
        for (var role in roles) {
            if (roles.hasOwnProperty(role)) {
                var intCode = parseInt(bitMask, 2);
                userRoles[roles[role]] = {
                    bitMask: intCode,
                    title: roles[role]
                };
                bitMask = (intCode << 1 ).toString(2);
            }
        }
        return userRoles;
    }

    /**
     * @description Builds access level bit masks based on the accessLevelDeclaration parameter which must
     * contain an array for each access level containing the allowed user roles.
     * @param accessLevelDeclarations
     * @param userRoles
     * @returns {Object}
     */
    function buildAccessLevels(accessLevelDeclarations, userRoles) {
        var accessLevels = {},
            resultBitMask,
            role;

        for (var level in accessLevelDeclarations) {
            if (accessLevelDeclarations.hasOwnProperty(level)) {
                if (typeof accessLevelDeclarations[level] === 'string') {
                    if (accessLevelDeclarations[level] === '*') {
                        resultBitMask = '';
                        for (role in userRoles) {
                            resultBitMask += "1";
                        }
                        accessLevels[level] = {
                            bitMask: parseInt(resultBitMask, 2),
                            title: accessLevelDeclarations[level]
                        };
                    } else {
                        console.error("Access Control Error: Could not parse '" +
                        accessLevelDeclarations[level] + "' as access definition for level '" + level + "'");
                    }
                } else {
                    resultBitMask = 0;
                    for (role in accessLevelDeclarations[level]) {
                        if (userRoles.hasOwnProperty(accessLevelDeclarations[level][role])) {
                            resultBitMask = resultBitMask | userRoles[accessLevelDeclarations[level][role]].bitMask;
                        } else {
                            console.error("Access Control Error: Could not find role '" +
                            accessLevelDeclarations[level][role] +
                            "' in registered roles while building access for '" + level + "'");
                        }
                    }
                    accessLevels[level] = {
                        bitMask: resultBitMask,
                        title: accessLevelDeclarations[level][role]
                    };
                }
            }
        }
        return accessLevels;
    }

    exports.userRoles = buildRoles(config.roles);
    exports.accessLevels = buildAccessLevels(config.accessLevels, exports.userRoles);
})(typeof exports === 'undefined' ? this['routingConfig'] = {} : exports);