import { IStorageAdapter } from './adapter.interface';
import { LocalStorageAdapter } from './local.adapter';
import { GoogleDriveStorageAdapter } from './gdrive.adapter';

let instance: IStorageAdapter | null = null;

export function getStorageAdapter(): IStorageAdapter {
  if (instance) return instance;

  const storageSource = process.env.STORAGE_SOURCE || 'local';

  if (storageSource === 'gdrive') {
    instance = new GoogleDriveStorageAdapter({
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
  } else {
    instance = new LocalStorageAdapter();
  }

  return instance;
}
