/**
 * Official WhatsApp Business Platform / Cloud API Adapter
 */

import { normalizePhone } from '@/lib/excel/normalizer';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppBatchItem {
  studentId: string;
  phone: string;
  message: string;
  templateParams?: string[];
  templateName?: string;
  language?: string;
}

export interface WhatsAppBatchResult {
  total: number;
  succeeded: string[];
  failed: Array<{ studentId: string; error: string }>;
  results?: Array<{ studentId: string; success: boolean; messageId?: string; error?: string }>;
}

export class WhatsAppCloudApiAdapter {
  private accessToken?: string;
  private phoneNumberId?: string;

  constructor(token?: string, phoneId?: string) {
    this.accessToken = token || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
    this.phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Send custom text or template message via WhatsApp Graph API
   */
  async sendMessage(toPhone: string, text: string): Promise<WhatsAppSendResult> {
    const cleanPhone = normalizePhone(toPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return {
        success: false,
        error: `Invalid recipient phone number: ${toPhone}`,
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'WhatsApp Cloud API is not configured. Please configure credentials in Settings or use Browser Queue.',
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: `91${cleanPhone}`,
            type: 'text',
            text: {
              preview_url: false,
              body: text,
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Meta WhatsApp API dispatch error');
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Process a batch of messages with controlled sequential delay to respect rate limits.
   */
  async sendBatch(items: WhatsAppBatchItem[], delayMs: number = 80): Promise<WhatsAppBatchResult> {
    const succeeded: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];
    const results: Array<{ studentId: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const item of items) {
      const result = await this.sendMessage(item.phone, item.message);
      if (result.success) {
        succeeded.push(item.studentId);
        results.push({ studentId: item.studentId, success: true, messageId: result.messageId });
      } else {
        failed.push({ studentId: item.studentId, error: result.error || 'Failed' });
        results.push({ studentId: item.studentId, success: false, error: result.error || 'Failed' });
      }

      if (delayMs > 0 && items.length > 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return {
      total: items.length,
      succeeded,
      failed,
      results,
    };
  }
}

