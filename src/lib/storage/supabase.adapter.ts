import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageAdapter } from './adapter.interface';

export class SupabaseStorageAdapter implements IStorageAdapter {
  private client: SupabaseClient;
  private bucketName: string;

  constructor(supabaseUrl?: string, supabaseKey?: string, bucketName: string = 'admit-cards') {
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucketName = bucketName;

    if (!url || !key) {
      throw new Error('CRITICAL CONFIGURATION ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for private storage access.');
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  /**
   * Upload binary file to private Supabase Storage bucket
   */
  async saveFile(
    fileName: string,
    buffer: Uint8Array,
    contentType: string = 'application/pdf'
  ): Promise<{ fileId: string; storageType: 'supabase' }> {
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const fileId = `${safeName}`;

    const { error } = await this.client.storage
      .from(this.bucketName)
      .upload(fileId, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload error: ${error.message}`);
    }

    return { fileId, storageType: 'supabase' };
  }

  /**
   * Retrieve binary file bytes from private storage
   */
  async getFile(fileId: string): Promise<Uint8Array | null> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .download(fileId);

    if (error || !data) {
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Delete file from private storage
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove([fileId]);

    return !error;
  }

  /**
   * Generate short-lived signed URL (60-second expiration) for secure student download
   */
  async getDownloadUrl(fileId: string, expiresInSeconds: number = 60): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUrl(fileId, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }
}
