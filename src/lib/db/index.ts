import { IDatabaseAdapter } from './adapter.interface';
import { LocalJsonDbAdapter } from './local.adapter';
import { FirestoreAdapter } from './firestore.adapter';

let instance: IDatabaseAdapter | null = null;

export function getDb(): IDatabaseAdapter {
  if (instance) return instance;

  const dataSource = process.env.DATA_SOURCE || 'local';

  if (dataSource === 'firestore') {
    instance = new FirestoreAdapter();
  } else {
    instance = new LocalJsonDbAdapter();
  }

  return instance;
}

export * from './adapter.interface';
