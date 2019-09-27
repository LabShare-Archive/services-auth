import {Provider, inject, Getter} from '@loopback/core';
import {AuthenticateFn, AuthenticationBindings} from '../keys';
import parseToken from 'parse-bearer-token';
import * as tiny from 'tiny-json-http';
import {Request} from '@loopback/rest';

export interface RequestWithUserInfo extends Request {
  userInfo: {
    [key: string]: any;
  };
}

/**
 * @description Provider of a function which authenticates
 * @example `context.bind('authentication_key')
 *   .toProvider(UserInfoActionProvider)`
 */
export class UserInfoActionProvider implements Provider<AuthenticateFn> {
  constructor(
    @inject.getter(AuthenticationBindings.AUTH_CONFIG)
    readonly getConfig: Getter<{
      [key: string]: any;
    }>,
  ) {}

  /**
   * Sequence handler for setting the user profile on the request
   */
  value(): AuthenticateFn {
    return (request: any) => this.action(request);
  }

  /**
   * @description The userInfo() sequence action. It attaches a "userInfo" object
   * to the incoming request if the following conditions are met:
   *  - The configuration has been set up for the component
   *  - A bearer token exists in the request headers
   *  - The user info endpoint request to the Auth service is successful
   */
  async action(request: RequestWithUserInfo): Promise<any> {
    const token = parseToken(request);

    // A bearer token is required to use the user_info route, so we skip the action if
    // it doesn't exist.
    if (!token) {
      return;
    }

    const {authUrl, tenant} = await this.getConfig();

    if (!authUrl) {
      throw new Error('`authUrl` configuration option is required');
    }

    if (!tenant) {
      throw new Error('`tenant` configuration option is required');
    }

    const {body} = await tiny.get({
      url: `${authUrl}/auth/${tenant}/me`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    request.userInfo = body;
  }
}
