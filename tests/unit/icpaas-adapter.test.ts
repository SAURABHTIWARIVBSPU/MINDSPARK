import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';

describe('ICPaaSAdapter Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly detects configured state with valid API key', () => {
    const adapter = new ICPaaSAdapter('f4aaf8f8-1866-49e6-b035-fa06093b010d', 'meenashahschool');
    expect(adapter.isConfigured()).toBe(true);
  });

  it('rejects unconfigured instance gracefully', async () => {
    const adapter = new ICPaaSAdapter('', '');
    expect(adapter.isConfigured()).toBe(false);

    const result = await adapter.sendMessage('9876543210', 'Test message');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('validates 10-digit Indian recipient mobile numbers', async () => {
    const adapter = new ICPaaSAdapter('f4aaf8f8-1866-49e6-b035-fa06093b010d', 'meenashahschool');
    
    // Invalid phone
    const result = await adapter.sendMessage('12345', 'Hello');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid recipient phone number');
  });

  it('successfully dispatches individual message when API responds 200 OK', async () => {
    const adapter = new ICPaaSAdapter('f4aaf8f8-1866-49e6-b035-fa06093b010d', 'meenashahschool');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'icpaas_msg_998877', status: 'QUEUED' }),
    } as any);

    const result = await adapter.sendMessage('8707744749', 'Admit Card Ready: MS261100037');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('icpaas_msg_998877');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles batch messages with error isolation', async () => {
    const adapter = new ICPaaSAdapter('f4aaf8f8-1866-49e6-b035-fa06093b010d', 'meenashahschool');

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 2) {
        return {
          ok: false,
          status: 400,
          text: async () => 'Rate limit exceeded',
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: `msg_${callCount}` }),
      } as any;
    });

    const items = [
      { studentId: 's1', phone: '9876543210', message: 'Message 1' },
      { studentId: 's2', phone: '9876543211', message: 'Message 2' },
      { studentId: 's3', phone: '9876543212', message: 'Message 3' },
    ];

    const batchRes = await adapter.sendBatch(items, 10);
    expect(batchRes.total).toBe(3);
    expect(batchRes.succeeded).toEqual(['s1', 's3']);
    expect(batchRes.failed.length).toBe(1);
    expect(batchRes.failed[0].studentId).toBe('s2');
  });
});
