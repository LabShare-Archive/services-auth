import {Component, ProviderMap} from '@loopback/core';
import {AuthenticationBindings} from './keys';
import {AuthenticateActionProvider, UserInfoActionProvider} from './providers';

export class LbServicesAuthComponent implements Component {
  constructor() {}

  providers?: ProviderMap = {
    [AuthenticationBindings.AUTH_ACTION.key]: AuthenticateActionProvider,
    [AuthenticationBindings.USER_INFO_ACTION.key]: UserInfoActionProvider,
  };
}
