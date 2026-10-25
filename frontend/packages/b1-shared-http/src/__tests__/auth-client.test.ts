import { describe, it, expect, vi } from 'vitest';
import { createAuthClient } from '../auth-client';

/**
 * EA-SEC-011 P2：auth-client refresh 双形态 + withCredentials 透传回归锚点。
 *
 * refresh() 无参空 body 是 platform-web / data-platform-web cookie 通道的
 * 唯一静默刷新入口——body 形态回归（如误发 { refreshToken: undefined }）
 * 会让后端双轨判定走 body 优先分支、绕过 cookie，必须钉死。
 */
describe('AuthClient.refresh (EA-SEC-011 P2)', () => {

  it('无参调用发空 body（cookie 通道：后端空 body 读 httpOnly cookie）', async () => {
    const client = createAuthClient({});
    const spy = vi.spyOn((client as any).api, 'post').mockResolvedValue({});

    await client.refresh();

    expect(spy).toHaveBeenCalledWith('/refresh/', {});
  });

  it('带参调用发 { refreshToken } body（迁移期兼容形态，后端双轨 body 优先）', async () => {
    const client = createAuthClient({});
    const spy = vi.spyOn((client as any).api, 'post').mockResolvedValue({});

    await client.refresh('session-id-123');

    expect(spy).toHaveBeenCalledWith('/refresh/', { refreshToken: 'session-id-123' });
  });

  it('refresh 响应经 mapTokenResult 映射为 TokenResult（session.token→access）', async () => {
    const client = createAuthClient({});
    vi.spyOn((client as any).api, 'post').mockResolvedValue({
      data: {
        session: { sessionId: 'sid-1', token: 'jwt-1' },
        user: { id: 'u1', name: 'op', roles: ['platform_admin'] },
      },
    });

    const result = await client.refresh();

    expect(result.access).toBe('jwt-1');
    expect(result.refresh).toBe('sid-1');
  });
});

describe('withCredentials 透传 (EA-SEC-011 P2)', () => {
  it('createAuthClient 透传 withCredentials 到内部 axios 实例', () => {
    const client = createAuthClient({ withCredentials: true });
    expect((client as any).api.defaults.withCredentials).toBe(true);
  });

  it('createApiClient 应用 withCredentials option（默认 undefined）', async () => {
    const { createApiClient } = await import('../client');
    const on = createApiClient({ basePath: '/t', withCredentials: true });
    const off = createApiClient({ basePath: '/t' });

    expect(on.defaults.withCredentials).toBe(true);
    expect(off.defaults.withCredentials).toBeUndefined();
  });
});
