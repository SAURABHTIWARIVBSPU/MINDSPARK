export interface StoredFile {
  fileId: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  data: Uint8Array;
}

export interface IStorageAdapter {
  saveFile(fileName: string, buffer: Uint8Array, contentType?: string): Promise<{ fileId: string; storageType: 'local' | 'gdrive' | 'supabase' }>;
  getFile(fileId: string): Promise<Uint8Array | null>;
  deleteFile(fileId: string): Promise<boolean>;
  getDownloadUrl(fileId: string): Promise<string>;
}
