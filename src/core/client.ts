import { State } from './state';
import { Request } from './request';
import { AccountRepository } from '../repositories/account.repository';
import { UserRepository } from '../repositories/user.repository';
import { QeRepository } from '../repositories/qe.repository';

export class IgApiClient {
  public state = new State();
  public request = new Request(this);
  /* Repositories */
  public account = new AccountRepository(this);
  public user = new UserRepository(this);
  public qe = new QeRepository(this);

  public destroy() {
    this.request.error$.complete();
    this.request.end$.complete();
  }
}
