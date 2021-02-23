## [3.4.2](https://github.com/LabShare/services-auth/compare/v3.4.1...v3.4.2) (2021-02-23)


### Bug Fixes

* upgrade jwks-rsa from 1.5.1 to 1.12.2 ([1f34141](https://github.com/LabShare/services-auth/commit/1f341419a5bc284c6405797d192d718813cef653))

## [3.4.1](https://github.com/LabShare/services-auth/compare/v3.4.0...v3.4.1) (2021-02-09)


### Bug Fixes

* **ci:** resolve missing test coverage reports ([a41dff8](https://github.com/LabShare/services-auth/commit/a41dff8fd0d5762638abb493d87adee4a25cc9c7))

# [3.4.0](https://github.com/LabShare/services-auth/compare/v3.3.1...v3.4.0) (2021-02-09)


### Bug Fixes

* **gh-actions:** replace Travis with Github Actions ([e210658](https://github.com/LabShare/services-auth/commit/e21065802290449023ca1401add65265b98dbf84))
* **pkg:** update semantic-release dev dependency versions ([16c288b](https://github.com/LabShare/services-auth/commit/16c288ba2abe2eddba13c5c060ec76e4e844bc4f))


### Features

* **authentication-decorator:** support "credentialsRequired" option ([c0e2c66](https://github.com/LabShare/services-auth/commit/c0e2c664a9b3dd53161343bb3224c8c9777b1563))

## [3.3.1](https://github.com/LabShare/services-auth/compare/v3.3.0...v3.3.1) (2020-04-01)


### Bug Fixes

* snyk ([3685f10](https://github.com/LabShare/services-auth/commit/3685f10))
* snyk and LbServicesAuthComponent alias ([0d6bcd6](https://github.com/LabShare/services-auth/commit/0d6bcd6))

# [3.3.0](https://github.com/LabShare/services-auth/compare/v3.2.5...v3.3.0) (2020-01-30)


### Features

* **jwt:** add option to configure audience using a provider ([135babe](https://github.com/LabShare/services-auth/commit/135babe))

## [3.2.5](https://github.com/LabShare/services-auth/compare/v3.2.4...v3.2.5) (2019-12-20)


### Bug Fixes

* **oauth2:** add missing scopes to unauthorized error message ([a4bae08](https://github.com/LabShare/services-auth/commit/a4bae08))

## [3.2.4](https://github.com/LabShare/services-auth/compare/v3.2.3...v3.2.4) (2019-11-11)


### Bug Fixes

* comment ([bb8f8fe](https://github.com/LabShare/services-auth/commit/bb8f8fe))
* throw error if forbidden ([fd30826](https://github.com/LabShare/services-auth/commit/fd30826))

## [3.2.3](https://github.com/LabShare/services-auth/compare/v3.2.2...v3.2.3) (2019-11-10)


### Bug Fixes

* undefined spec at authentication provider ([9a57ae1](https://github.com/LabShare/services-auth/commit/9a57ae1))

## [3.2.2](https://github.com/LabShare/services-auth/compare/v3.2.1...v3.2.2) (2019-10-18)


### Bug Fixes

* **docs:** update configuration option documentation LSAUTH-231 ([60acf41](https://github.com/LabShare/services-auth/commit/60acf41))

## [3.2.1](https://github.com/LabShare/services-auth/compare/v3.2.0...v3.2.1) (2019-10-08)


### Bug Fixes

* **pkg:** fix npm package contents ([441f8f4](https://github.com/LabShare/services-auth/commit/441f8f4))

# [3.2.0](https://github.com/LabShare/services-auth/compare/v3.1.0...v3.2.0) (2019-10-04)


### Features

* **profile:** add user info sequence action ([8894a6b](https://github.com/LabShare/services-auth/commit/8894a6b))

# [3.1.0](https://github.com/LabShare/services-auth/compare/v3.0.3...v3.1.0) (2019-10-03)


### Features

* refactor [@authenticate](https://github.com/authenticate) decorator ([ffbef46](https://github.com/LabShare/services-auth/commit/ffbef46))

## [3.0.3](https://github.com/LabShare/services-auth/compare/v3.0.2...v3.0.3) (2019-08-02)


### Bug Fixes

* **ts:** fix typing for secret callback ([c206f39](https://github.com/LabShare/services-auth/commit/c206f39))
* **ts:** fix typing of revoked callback ([04bd1aa](https://github.com/LabShare/services-auth/commit/04bd1aa))

## [3.0.2](https://github.com/LabShare/services-auth/compare/v3.0.1...v3.0.2) (2019-07-11)


### Bug Fixes

* **pkg:** fix missing 'dist' in NPM package ([f39d4be](https://github.com/LabShare/services-auth/commit/f39d4be))

## [3.0.1](https://github.com/LabShare/services-auth/compare/v3.0.0...v3.0.1) (2019-07-09)


### Bug Fixes

* fix Travis CI badge ([cc8fca4](https://github.com/LabShare/services-auth/commit/cc8fca4))

# [3.0.0](https://github.com/LabShare/services-auth/compare/v2.2.2...v3.0.0) (2019-07-03)


### Features

* **lb4:** loopback 4 authz support ([e9d4cf4](https://github.com/LabShare/services-auth/commit/e9d4cf4))


### BREAKING CHANGES

* **lb4:** replace implementation with a Loopback 4 version that uses
controller and method Lb4 decorators to enable authz.

## [2.2.2](https://github.com/LabShare/services-auth/compare/v2.2.1...v2.2.2) (2019-06-28)


### Bug Fixes

* **authz:** add error message for failed /auth/me requests ([#79](https://github.com/LabShare/services-auth/issues/79)) ([c229b5c](https://github.com/LabShare/services-auth/commit/c229b5c))

## [2.2.1](https://github.com/LabShare/services-auth/compare/v2.2.0...v2.2.1) (2019-05-31)


### Bug Fixes

* **ci:** remove unused publishing package ([095ee3a](https://github.com/LabShare/services-auth/commit/095ee3a))

# [2.2.0](https://github.com/LabShare/services-auth/compare/v2.1.4...v2.2.0) (2019-05-30)


### Features

* **jwt:** expose isRevokedCallback option ([af94332](https://github.com/LabShare/services-auth/commit/af94332))

## [2.1.4](https://github.com/LabShare/services-auth/compare/v2.1.3...v2.1.4) (2019-01-30)


### Bug Fixes

* parseBearerToken module issue ([7f9800b](https://github.com/LabShare/services-auth/commit/7f9800b))

## [2.1.3](https://github.com/LabShare/services-auth/compare/v2.1.2...v2.1.3) (2018-11-02)


### Bug Fixes

* **pkg:** use library instead of custom code to parse bearer token ([09345b0](https://github.com/LabShare/services-auth/commit/09345b0))

## [2.1.2](https://github.com/LabShare/services-auth/compare/v2.1.1...v2.1.2) (2018-09-12)


### Bug Fixes

* **pkg:** npm access should be public ([a797da8](https://github.com/LabShare/services-auth/commit/a797da8))

## [2.1.1](https://github.com/LabShare/services-auth/compare/v2.1.0...v2.1.1) (2018-08-30)


### Bug Fixes

* **pkg:** pin "deprecate" until TypeError is fixed ([47f1f54](https://github.com/LabShare/services-auth/commit/47f1f54))

# [2.1.0](https://github.com/LabShare/services-auth/compare/v2.0.2...v2.1.0) (2018-08-22)


### Features

* **api:** export generic RS256 middleware for Express.js AUTH-1315 ([20e4509](https://github.com/LabShare/services-auth/commit/20e4509))

## [2.0.2](https://github.com/LabShare/services-auth/compare/v2.0.1...v2.0.2) (2018-08-22)


### Bug Fixes

* **options:** optional authUrl with custom secretProvider AUTH-1314 ([532bece](https://github.com/LabShare/services-auth/commit/532bece))

## [2.0.1](https://github.com/LabShare/services-auth/compare/v2.0.0...v2.0.1) (2018-08-10)


### Bug Fixes

* **options:** use express-jwt fork to avoid TypeError AUTH-1286 ([bb21eec](https://github.com/LabShare/services-auth/commit/bb21eec))

# [2.0.0](https://github.com/LabShare/services-auth/compare/v1.20.0...v2.0.0) (2018-07-16)


### Features

* rename "organization" configuration option to "tenant" AUTH-1217 ([13bd13d](https://github.com/LabShare/services-auth/commit/13bd13d))


### BREAKING CHANGES

* The "organization" configuration option is now "tenant".

# [1.20.0](https://github.com/LabShare/services-auth/compare/v1.19.0...v1.20.0) (2018-06-30)


### Features

* **npm:** integrate with semantic-release SHELL-1528 ([ed42ef2](https://github.com/LabShare/services-auth/commit/ed42ef2))
* **npm:** use npm versioned labshare dependencies SHELL-1536 ([93cd0ad](https://github.com/LabShare/services-auth/commit/93cd0ad))

<a name="1.19.0"></a>
# [1.19.0](https://github.com/LabShare/services-auth/compare/v1.18.515...v1.19.0) (2018-05-22)


### Features

* **git:** Enforce structure of commit messages ([3e43a04](https://github.com/LabShare/services-auth/commit/3e43a04))
* **git:** Enforce structure of commit messages automatically ([e5f8e9f](https://github.com/LabShare/services-auth/commit/e5f8e9f))
