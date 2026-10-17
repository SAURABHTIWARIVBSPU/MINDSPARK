import { IDatabaseAdapter } from './adapter.interface';
import { LocalJsonDbAdapter } from './local.adapter';
import { FirestoreAdapter } from './firestore.adapter';
import { SupabaseAdapter } from './supabase.adapter';

let instance: IDatabaseAdapter | null = null;

export function getDb(): IDatabaseAdapter {
  if (instance) return instance;

  const dataSource = (process.env.DATA_SOURCE || '').toLowerCase();
  const hasSupabaseEnv =
    !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

  if (dataSource === 'supabase' || (dataSource !== 'local' && dataSource !== 'firestore' && hasSupabaseEnv)) {
    try {
      instance = new SupabaseAdapter();
    } catch (err) {
      console.warn('Failed to initialize SupabaseAdapter, falling back to LocalJsonDbAdapter:', err);
      instance = new LocalJsonDbAdapter();
    }
  } else if (dataSource === 'firestore') {
    instance = new FirestoreAdapter();
  } else {
    instance = new LocalJsonDbAdapter();
  }

  return instance;
}

export function resetDbInstance(): void {
  instance = null;
}

export * from './adapter.interface';

