import {Component, ProviderMap} from '@loopback/core';
import {AuthenticationBindings} from './keys';
import {AuthenticateActionProvider} from './providers/authentication.provider';

export class LbServicesAuthComponent implements Component {
  constructor() {}

  providers?: ProviderMap = {
    [AuthenticationBindings.AUTH_ACTION.key]: AuthenticateActionProvider,
  };
}
