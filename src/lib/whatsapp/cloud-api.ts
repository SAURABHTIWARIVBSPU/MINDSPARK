/**
 * Official WhatsApp Business Platform / Cloud API Adapter
 */

import { normalizePhone } from '@/lib/excel/normalizer';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isUncertain?: boolean;
  httpStatus?: number;
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

/**
 * @deprecated Deprecated & Disabled per production policy.
 * Only the single approved ICPS-recommended messaging method (ICPaaS Gateway) is active.
 */
export class WhatsAppCloudApiAdapter {
  private accessToken?: string;
  private phoneNumberId?: string;

  constructor(token?: string, phoneId?: string) {
    this.accessToken = token || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
    this.phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  isConfigured(): boolean {
    return false; // Permanently disabled in favor of approved ICPaaS Gateway
  }

  /**
   * @deprecated Disabled provider.
   */
  async sendMessage(toPhone: string, text: string): Promise<WhatsAppSendResult> {
    return {
      success: false,
      error: 'WhatsApp Cloud API direct provider is deprecated and disabled. All messages must be dispatched through the ICPS-recommended ICPaaS Gateway.',
    };
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

