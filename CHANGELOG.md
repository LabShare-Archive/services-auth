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
