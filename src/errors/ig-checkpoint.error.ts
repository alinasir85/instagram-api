import { IgResponseError } from './ig-response.error';

export class IgCheckpointError extends IgResponseError<any> {
  get url() {
    return this.response.body.challenge.url;
  }

  get apiUrl() {
    return 'https://i.instagram.com/api/v1' + this.response.body.challenge.api_path;
  }
}
