/**
 * ICPaaS (icpaas.in) WhatsApp & Messaging Provider Gateway Adapter
 */

import { normalizePhone } from '@/lib/excel/normalizer';
import { WhatsAppSendResult, WhatsAppBatchItem, WhatsAppBatchResult } from './cloud-api';

export interface WhatsAppTemplateParam {
  name: string;
  language?: string;
  bodyVariables?: string[];
}

export class ICPaaSAdapter {
  private apiKey?: string;
  private username?: string;
  private mobile?: string;
  private email?: string;
  private apiUrl: string;
  private phoneNumberId?: string;
  private wabaId?: string;
  private templateName?: string;

  constructor(apiKey?: string, username?: string) {
    this.apiKey = (apiKey || process.env.ICPAAS_API_KEY || '').trim();
    this.username = username || process.env.ICPAAS_USERNAME || 'meenashahschool';
    this.mobile = process.env.ICPAAS_MOBILE || '8707744749';
    this.email = process.env.ICPAAS_EMAIL || 'tabrezaalam92@gmail.com';
    this.phoneNumberId = process.env.ICPAAS_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '1346032508598977';
    this.apiUrl =
      process.env.ICPAAS_API_URL ||
      (this.phoneNumberId ? `https://icpaas.in/v23.0/${this.phoneNumberId}/messages` : 'https://icpaas.in/api/v1/send');
    this.wabaId = process.env.ICPAAS_WABA_ID || process.env.WHATSAPP_WABA_ID || '1119511721006574';
    this.templateName = process.env.ICPAAS_TEMPLATE_NAME || 'admit_card_new';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.length > 5);
  }

  /**
   * Dispatch a message to an individual student phone via ICPaaS official API
   */
  async sendMessage(
    toPhone: string,
    text: string,
    templateConfig?: {
      templateName?: string;
      language?: string;
      bodyParams?: string[];
      bizOpaqueCallbackData?: string;
    }
  ): Promise<WhatsAppSendResult> {
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

    const tName = templateConfig?.templateName || this.templateName;
    const bodyVars = templateConfig?.bodyParams && templateConfig.bodyParams.length > 0 ? templateConfig.bodyParams : [text];

    // Check if using the official v23.0 Meta messages endpoint or legacy endpoint
    const isMetaEndpoint = this.apiUrl.includes('/v23.0/') || this.apiUrl.includes('/messages');

    const payload: any = isMetaEndpoint
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanPhone}`,
          type: 'template',
          template: {
            name: tName,
            language: { code: templateConfig?.language || 'en' },
            components: [
              {
                type: 'body',
                parameters: bodyVars.map((v) => ({
                  type: 'text',
                  text: v,
                })),
              },
            ],
          },
          ...(templateConfig?.bizOpaqueCallbackData ? { biz_opaque_callback_data: templateConfig.bizOpaqueCallbackData } : {}),
        }
      : {
          channel: 'WhatsApp',
          to: [`91${cleanPhone}`],
          from: this.phoneNumberId || this.mobile,
          content: {
            data: {
              templatepayload: {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                type: 'template',
                template: {
                  name: tName,
                  language: { code: templateConfig?.language || 'en' },
                  components: [
                    {
                      type: 'body',
                      parameters: bodyVars.map((v) => ({
                        type: 'text',
                        text: v,
                      })),
                    },
                  ],
                },
              },
            },
          },
        };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let responseData: any = {};
      let responseText = '';
      try {
        if (typeof response.json === 'function') {
          responseData = await response.json();
        } else if (typeof response.text === 'function') {
          responseText = await response.text();
          responseData = JSON.parse(responseText);
        }
      } catch {
        if (typeof response.text === 'function') {
          try {
            responseText = await response.text();
            responseData = { raw: responseText };
          } catch {}
        }
      }

      if (!response.ok) {
        const errorMsg =
          responseData?.error?.message ||
          responseData?.message ||
          responseData?.error ||
          responseData?.response?.[0]?.message ||
          responseText ||
          `HTTP ${response.status} ${response.statusText}`;

        const isUncertain = response.status === 504 || response.status === 408 || response.status === 502 || response.status === 503;
        return {
          success: false,
          isUncertain,
          httpStatus: response.status,
          error: `ICPaaS Error [HTTP ${response.status}]: ${errorMsg}${isUncertain ? ' (Uncertain delivery state - reconcile status before retry)' : ''}`,
        };
      }

      const messageId =
        responseData.messages?.[0]?.id ||
        responseData.messageId ||
        responseData.id ||
        responseData.data?.id ||
        `icpaas_${Date.now()}_${cleanPhone}`;

      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      const isUncertain = /timeout|timed out|etimedout|econnreset|socket/i.test(err.message || '');
      return {
        success: false,
        isUncertain,
        httpStatus: isUncertain ? 504 : 0,
        error: `Network dispatch error: ${err.message}${isUncertain ? ' (Uncertain delivery state - reconcile status before retry)' : ''}`,
      };
    }
  }

  /**
   * Process a controlled batch of messages with sequential rate-limiting delay
   */
  async sendBatch(items: WhatsAppBatchItem[], delayMs: number = 100): Promise<WhatsAppBatchResult> {
    const succeeded: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];
    const results: Array<{ studentId: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const item of items) {
      const result = await this.sendMessage(item.phone, item.message, {
        templateName: item.templateName,
        language: item.language,
        bodyParams: item.templateParams,
      });
      if (result.success) {
        succeeded.push(item.studentId);
        results.push({ studentId: item.studentId, success: true, messageId: result.messageId });
      } else {
        failed.push({ studentId: item.studentId, error: result.error || 'Dispatch Failed' });
        results.push({ studentId: item.studentId, success: false, error: result.error || 'Dispatch Failed' });
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
