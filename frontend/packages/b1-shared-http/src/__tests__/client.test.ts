import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from '../client';

describe('createApiClient', () => {
  it('should create an axios instance with correct baseURL', () => {
    const api = createApiClient({ basePath: '/platform' });
    expect(api.defaults.baseURL).toBe('/api/v1/platform');
  });

  it('should inject Authorization header via getToken', () => {
    const api = createApiClient({
      basePath: '/test',
      getToken: () => 'token-123',
    });

    const handlers = (api.interceptors.request as any).handlers;
    const config = { headers: {} } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer token-123');
  });

  it('should inject X-Tenant-ID header via getTenantId', () => {
    const api = createApiClient({
      basePath: '/test',
      getTenantId: () => 'tenant-456',
    });

    const handlers = (api.interceptors.request as any).handlers;
    const config = { headers: {} } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.headers['X-Tenant-ID']).toBe('tenant-456');
  });

  it('should inject Idempotency-Key for write methods (POST)', () => {
    const api = createApiClient({ basePath: '/test' });
    const handlers = (api.interceptors.request as any).handlers;
    const config = { method: 'post', headers: {} } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.headers['Idempotency-Key']).toBeTruthy();
    expect(typeof result.headers['Idempotency-Key']).toBe('string');
    expect(result.headers['Idempotency-Key'].length).toBeGreaterThan(0);
  });

  it('should NOT inject Idempotency-Key for GET requests', () => {
    const api = createApiClient({ basePath: '/test' });
    const handlers = (api.interceptors.request as any).handlers;
    const config = { method: 'get', headers: {} } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.headers['Idempotency-Key']).toBeUndefined();
  });

  it('should NOT overwrite an existing Idempotency-Key', () => {
    const api = createApiClient({ basePath: '/test' });
    const handlers = (api.interceptors.request as any).handlers;
    const config = { method: 'post', headers: { 'Idempotency-Key': 'caller-key-123' } } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.headers['Idempotency-Key']).toBe('caller-key-123');
  });

  it('should unwrap success+data envelope', () => {
    const api = createApiClient({ basePath: '/test' });

    const handlers = (api.interceptors.response as any).handlers;
    const response = {
      data: { success: true, code: 200, message: 'OK', data: { id: '1' } },
    };
    const result = handlers[0].fulfilled(response);

    expect(result.data).toEqual({ id: '1' });
  });

  // ---- FEQ-06：envelopeValidation 三态（success=false 信封的处置） ----

  const bizFailEnvelope = {
    data: { success: false, code: 'BIZ_001', message: '库存不足', data: null },
  };

  it('should reject with business error on success=false envelope when strict', async () => {
    const api = createApiClient({ basePath: '/test', envelopeValidation: 'strict' });
    const handlers = (api.interceptors.response as any).handlers;

    await expect(handlers[0].fulfilled(bizFailEnvelope)).rejects.toMatchObject({
      message: '[BIZ_001] 库存不足',
      businessMessage: '库存不足',
    });
  });

  it('should only console.warn (not reject) on success=false envelope when observe', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = createApiClient({ basePath: '/test', envelopeValidation: 'observe' });
    const handlers = (api.interceptors.response as any).handlers;

    const result = handlers[0].fulfilled(bizFailEnvelope);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[shared-http] envelope success=false (observe)'),
    );
    expect(result.data).toBeNull();
    warnSpy.mockRestore();
  });

  it('should silently unwrap success=false envelope when off (default)', () => {
    const api = createApiClient({ basePath: '/test' });
    const handlers = (api.interceptors.response as any).handlers;

    const result = handlers[0].fulfilled(bizFailEnvelope);

    expect(result.data).toBeNull();
  });

  it('should have rejected handler on request interceptor', () => {
    const api = createApiClient({ basePath: '/test' });

    const handlers = (api.interceptors.request as any).handlers;
    expect(handlers[0].rejected).toBeDefined();
    expect(typeof handlers[0].rejected).toBe('function');
  });

  it('should have rejected handler on response interceptor', () => {
    const api = createApiClient({ basePath: '/test' });

    const handlers = (api.interceptors.response as any).handlers;
    expect(handlers[0].rejected).toBeDefined();
    expect(typeof handlers[0].rejected).toBe('function');
  });

  it('should pass through request errors in rejected handler', async () => {
    const api = createApiClient({ basePath: '/test' });

    const handlers = (api.interceptors.request as any).handlers;
    const error = new Error('request error');

    await expect(handlers[0].rejected(error)).rejects.toThrow('request error');
  });

  it('should snakeize plain object body when snakeCaseRequest enabled', () => {
    const api = createApiClient({ basePath: '/test', snakeCaseRequest: true });
    const handlers = (api.interceptors.request as any).handlers;
    const config = { headers: {}, data: { camelCase: 'value', nested: { fooBar: 1 } } } as any;
    const result = handlers[0].fulfilled(config);

    expect(result.data).toEqual({ camel_case: 'value', nested: { foo_bar: 1 } });
  });

  it('should NOT snakeize FormData body when snakeCaseRequest enabled (regression guard)', () => {
    const api = createApiClient({ basePath: '/test', snakeCaseRequest: true });
    const handlers = (api.interceptors.request as any).handlers;

    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.csv');
    formData.append('entity_type', 'vehicle');
    const config = { headers: {}, data: formData } as any;
    const result = handlers[0].fulfilled(config);

    // FormData must be preserved as-is, not replaced with {} (snakeizeKeys(FormData) === {})
    expect(result.data).toBe(formData);
    expect(result.data instanceof FormData).toBe(true);
  });

  it('should NOT camelize Blob response when camelCaseResponse enabled (regression guard)', () => {
    const api = createApiClient({ basePath: '/test', camelCaseResponse: true });
    const handlers = (api.interceptors.response as any).handlers;

    const blob = new Blob(['binary-data'], { type: 'text/csv' });
    const response = { data: blob } as any;
    const result = handlers[0].fulfilled(response);

    // Blob must be preserved as-is: camelizeKeys(Blob) === {} because
    // Object.entries(blob) === [], breaking responseType: 'blob' downloads.
    expect(result.data).toBe(blob);
    expect(result.data instanceof Blob).toBe(true);
  });
});
