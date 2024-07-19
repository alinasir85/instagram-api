import { Repository } from '../core/repository';
import { IgExactUserNotFoundError } from '../errors';
import { defaults } from 'lodash';
import * as Chance from 'chance';

export class UserRepository extends Repository {
  async info(id: string | number): Promise<any> {
    const { body } = await this.client.request.send({
      url: `/api/v1/users/${id}/info/`,
    });
    return body.user;
  }

  async search(username: string): Promise<any> {
    const { body } = await this.client.request.send({
      url: `/api/v1/users/search/`,
      qs: {
        timezone_offset: this.client.state.timezoneOffset,
        q: username,
        count: 30,
      },
    });
    return body;
  }

  async searchExact(username: string): Promise<any> {
    username = username.toLowerCase();
    const result = await this.search(username);
    const users = result.users;
    const account = users.find(user => user.username === username);
    if (!account) {
      throw new IgExactUserNotFoundError();
    }
    return account;
  }

  async accountDetails(id?: string | number) {
    id = id || this.client.state.cookieUserId;
    const { body } = await this.client.request.send({
      url: `/api/v1/users/${id}/account_details/`,
    });
    return body;
  }

  async getIdByUsername(username: string): Promise<number> {
    const user = await this.searchExact(username);
    return user.pk;
  }

  public async lookup(options) {
    options = defaults(options, {
      waterfallId: new Chance().guid({ version: 4 }),
      directlySignIn: true,
      countryCodes: [{ country_code: '1', source: ['default'] }],
    });
    const { body } = await this.client.request.send({
      url: '/api/v1/users/lookup/',
      method: 'POST',
      form: this.client.request.sign({
        country_codes: JSON.stringify(options.countryCodes),
        _csrftoken: this.client.state.cookieCsrfToken,
        q: options.query,
        guid: this.client.state.uuid,
        device_id: this.client.state.deviceId,
        waterfall_id: options.waterfallId,
        directly_sign_in: options.directlySignIn.toString(),
      }),
    });
    return body;
  }
}
