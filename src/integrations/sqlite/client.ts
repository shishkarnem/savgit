/**
 * SAV BD ProTalk Database Client Proxy
 * Re-exports canonical ProTalk client for seamless 100% backward compatibility.
 */

export {
  ProTalkQueryBuilder,
  ProTalkFunctionsClient,
  ProTalkDBClient,
  protalkDb,
  dbClient,
  sqlite,
  createClient
} from '../protalk/client';

export { protalkDb as default } from '../protalk/client';
