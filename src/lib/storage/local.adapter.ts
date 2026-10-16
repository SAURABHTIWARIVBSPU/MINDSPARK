import fs from 'fs';
import path from 'path';
import { IStorageAdapter } from './adapter.interface';

export class LocalStorageAdapter implements IStorageAdapter {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.join(process.cwd(), 'storage', 'admit-cards');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(fileName: string, buffer: Uint8Array, contentType: string = 'application/pdf'): Promise<{ fileId: string; storageType: 'local' | 'gdrive' }> {
    // Generate sanitized unique ID
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const fileId = `${Date.now()}_${safeName}`;
    const filePath = path.join(this.baseDir, fileId);

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { fileId, storageType: 'local' };
  }

  async getFile(fileId: string): Promise<Uint8Array | null> {
    const safeId = path.basename(fileId);
    const filePath = path.join(this.baseDir, safeId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = fs.readFileSync(filePath);
    return new Uint8Array(data);
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const safeId = path.basename(fileId);
    const filePath = path.join(this.baseDir, safeId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    // Local download endpoint proxy
    return `/api/admit-cards/download/${encodeURIComponent(fileId)}`;
  }
}
