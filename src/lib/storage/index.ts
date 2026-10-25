import { IStorageAdapter } from './adapter.interface';
import { LocalStorageAdapter } from './local.adapter';
import { GoogleDriveStorageAdapter } from './gdrive.adapter';
import { SupabaseStorageAdapter } from './supabase.adapter';

let instance: IStorageAdapter | null = null;

export function getStorageAdapter(): IStorageAdapter {
  if (instance) return instance;

  const storageSource = (process.env.STORAGE_SOURCE || '').toLowerCase();
  const isServerlessProduction = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const hasSupabase = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
                      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (storageSource === 'supabase' || (storageSource !== 'local' && storageSource !== 'gdrive' && hasSupabase)) {
    try {
      instance = new SupabaseStorageAdapter();
      return instance;
    } catch (err) {
      if (isServerlessProduction) {
        throw new Error(
          `CRITICAL STORAGE ERROR: SupabaseStorageAdapter initialization failed in production: ${err instanceof Error ? err.message : err}. Ephemeral local storage fallback is disabled in production to prevent silent document loss.`
        );
      }
      console.warn('Failed to initialize SupabaseStorageAdapter in dev, falling back to LocalStorageAdapter:', err);
      instance = new LocalStorageAdapter();
      return instance;
    }
  }

  if (storageSource === 'gdrive') {
    instance = new GoogleDriveStorageAdapter({
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
  } else {
    if (isServerlessProduction) {
      throw new Error('CRITICAL ARCHITECTURE CONFIGURATION ERROR: Ephemeral local storage cannot be used in serverless production.');
    }
    instance = new LocalStorageAdapter();
  }

  return instance;
}

export function resetStorageInstance(): void {
  instance = null;
}
