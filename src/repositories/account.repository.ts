import { Repository } from '../core/repository';
import {
  IgLoginBadPasswordError,
  IgLoginInvalidUserError,
  IgLoginTwoFactorRequiredError,
  IgResponseError,
} from '../errors';
import { IgSignupBlockError } from '../errors/ig-signup-block.error';
import debug from 'debug';
import * as crypto from 'crypto';
import Bluebird = require('bluebird');

export class AccountRepository extends Repository {
  private static accountDebug = debug('ig:account');
  public async login(username: string, password: string): Promise<any> {
    if (!this.client.state.passwordEncryptionPubKey) {
      await this.client.qe.syncLoginExperiments();
    }
    const {encrypted, time} = this.encryptPassword(password);
    const response = await Bluebird.try(() =>
      this.client.request.send({
        method: 'POST',
        url: '/api/v1/accounts/login/',
        form: this.client.request.sign({
          username,
          enc_password: `#PWD_INSTAGRAM:4:${time}:${encrypted}`,
          guid: this.client.state.uuid,
          phone_id: this.client.state.phoneId,
          _csrftoken: this.client.state.cookieCsrfToken,
          device_id: this.client.state.deviceId,
          adid: this.client.state.adid,
          google_tokens: '[]',
          login_attempt_count: 0,
          country_codes: JSON.stringify([{ country_code: '1', source: 'default' }]),
          jazoest: AccountRepository.createJazoest(this.client.state.phoneId),
        }),
      }),
    ).catch(IgResponseError, error => {
      if (error.response.body.two_factor_required) {
        AccountRepository.accountDebug(
          `Login failed, two factor auth required: ${JSON.stringify(error.response.body.two_factor_info)}`,
        );
        throw new IgLoginTwoFactorRequiredError(error.response);
      }
      switch (error.response.body.error_type) {
        case 'bad_password': {
          throw new IgLoginBadPasswordError(error.response);
        }
        case 'invalid_user': {
          throw new IgLoginInvalidUserError(error.response);
        }
        default: {
          throw error;
        }
      }
    });
    return response.body.logged_in_user;
  }

  public static createJazoest(input: string): string {
    const buf = Buffer.from(input, 'ascii');
    let sum = 0;
    for (let i = 0; i < buf.byteLength; i++) {
      sum += buf.readUInt8(i);
    }
    return `2${sum}`;
  }

  public encryptPassword(password: string): { time: string, encrypted: string } {
    const randKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const rsaEncrypted = crypto.publicEncrypt({
      key: Buffer.from(this.client.state.passwordEncryptionPubKey, 'base64').toString(),
      // @ts-ignore
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, randKey);
    const cipher = crypto.createCipheriv('aes-256-gcm', randKey, iv);
    const time = Math.floor(Date.now() / 1000).toString();
    cipher.setAAD(Buffer.from(time));
    const aesEncrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    const sizeBuffer = Buffer.alloc(2, 0);
    sizeBuffer.writeInt16LE(rsaEncrypted.byteLength, 0);
    const authTag = cipher.getAuthTag();
    return {
      time,
      encrypted: Buffer.concat([
        Buffer.from([1, this.client.state.passwordEncryptionKeyId]),
        iv,
        sizeBuffer,
        rsaEncrypted, authTag, aesEncrypted])
        .toString('base64'),
    };
  }

  public async logout() {
    const { body } = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/accounts/logout/',
      form: {
        guid: this.client.state.uuid,
        phone_id: this.client.state.phoneId,
        _csrftoken: this.client.state.cookieCsrfToken,
        device_id: this.client.state.deviceId,
        _uuid: this.client.state.uuid,
      },
    });
    return body;
  }

  async create({ username, password, email, first_name }) {
    const { body } = await Bluebird.try(() =>
      this.client.request.send({
        method: 'POST',
        url: '/api/v1/accounts/create/',
        form: this.client.request.sign({
          username,
          password,
          email,
          first_name,
          guid: this.client.state.uuid,
          device_id: this.client.state.deviceId,
          _csrftoken: this.client.state.cookieCsrfToken,
          force_sign_up_code: '',
          qs_stamp: '',
          waterfall_id: this.client.state.uuid,
          sn_nonce: '',
          sn_result: '',
        }),
      }),
    ).catch(IgResponseError, error => {
      switch (error.response.body.error_type) {
        case 'signup_block': {
          AccountRepository.accountDebug('Signup failed');
          throw new IgSignupBlockError(error.response);
        }
        default: {
          throw error;
        }
      }
    });
    return body;
  }

  public async setBiography(text: string) {
    const { body } = await this.client.request.send({
      url: '/api/v1/accounts/set_biography/',
      method: 'POST',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uid: this.client.state.cookieUserId,
        device_id: this.client.state.deviceId,
        _uuid: this.client.state.uuid,
        raw_text: text,
      }),
    });
    return body.user;
  }
}
