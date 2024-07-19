/* tslint:disable:no-console */
import 'dotenv/config';
import { IgApiClient } from '../src';

/**
 * This method won't catch all checkpoint errors
 * There's currently a new checkpoint used by instagram which requires 'web-support'
 */
const IG_USERNAME = 'aghaalinasir363@gmail.com';
const IG_PASSWORD = 'shahzaib8';

(async () => {
  const ig = new IgApiClient();
  ig.state.generateDevice(IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;
  await ig.account.login(IG_USERNAME, IG_PASSWORD);

  const userInfo = await ig.user.info('1692820292');
  console.log('userInfo: ', userInfo);

  const bio = await ig.account.setBiography('update');
  console.log('bio: ', bio);

  // const follow = await ig.friendship.create('1692820292');
  // console.log('followed: ', follow);
})();
