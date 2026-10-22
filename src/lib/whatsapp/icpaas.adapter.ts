/**
 * ICPaaS (icpaas.in) WhatsApp & Messaging Provider Gateway Adapter
 */

import { normalizePhone } from '@/lib/excel/normalizer';
import { WhatsAppSendResult, WhatsAppBatchItem, WhatsAppBatchResult } from './cloud-api';

export class ICPaaSAdapter {
  private apiKey?: string;
  private username?: string;
  private mobile?: string;
  private email?: string;
  private apiUrl: string;

  constructor(apiKey?: string, username?: string) {
    this.apiKey = apiKey || process.env.ICPAAS_API_KEY;
    this.username = username || process.env.ICPAAS_USERNAME || 'meenashahschool';
    this.mobile = process.env.ICPAAS_MOBILE || '8707744749';
    this.email = process.env.ICPAAS_EMAIL || 'tabrezaalam92@gmail.com';
    this.apiUrl = process.env.ICPAAS_API_URL || 'https://icpaas.in/api/v1/whatsapp/send';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Dispatch a message to an individual student phone via ICPaaS REST API
   */
  async sendMessage(toPhone: string, text: string): Promise<WhatsAppSendResult> {
    const cleanPhone = normalizePhone(toPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return {
        success: false,
        error: `Invalid recipient phone number: ${toPhone}. Expected 10-digit Indian mobile.`,
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'ICPaaS Gateway is not configured. Please set ICPAAS_API_KEY in .env.local.',
      };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey!,
          Authorization: `Bearer ${this.apiKey!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.username,
          senderMobile: this.mobile,
          to: `91${cleanPhone}`,
          type: 'text',
          message: text,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        // If provider endpoint returns 404 or specific template required, inform cleanly
        throw new Error(`ICPaaS dispatch error (HTTP ${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        messageId: data.messageId || data.id || `icpaas_${Date.now()}_${cleanPhone}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Process a controlled batch of messages with sequential rate-limiting delay
   */
  async sendBatch(items: WhatsAppBatchItem[], delayMs: number = 100): Promise<WhatsAppBatchResult> {
    const succeeded: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (const item of items) {
      const result = await this.sendMessage(item.phone, item.message);
      if (result.success) {
        succeeded.push(item.studentId);
      } else {
        failed.push({ studentId: item.studentId, error: result.error || 'Dispatch Failed' });
      }

      if (delayMs > 0 && items.length > 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return {
      total: items.length,
      succeeded,
      failed,
    };
  }
}
