/**
 * 认证前缀存储模块（原 secureStorage 命名纠偏，ADT-ALL-003 FEQ-08）：
 * 仅提供 cdd_auth_ 前缀的 Web Storage 封装，并非加密存储。
 *
 * EA-SEC-011 P2 收官：三端 web 凭据已全量迁 httpOnly cookie，
 * token 存取方法（setToken/getToken/setRefreshToken/getRefreshToken）
 * 已删除——凭据从此不进任何 JS 可读存储；本模块仅承载 tenantId
 * （非机密，http 拦截器依赖）与通用前缀读写、首启清理（removeItem）。
 */

export type StorageType = 'localStorage' | 'sessionStorage';

export type StorageApi = {
  setItem: (key: string, value: string, type?: StorageType) => void;
  getItem: (key: string, type?: StorageType) => string | null;
  removeItem: (key: string, type?: StorageType) => void;
};

const AUTH_PREFIX = 'cdd_auth_';

/**
 * 判断是否为开发模式
 */
export function isDevelopmentMode(): boolean {
  try {
    const env = (import.meta as unknown as Record<string, Record<string, unknown>>).env;
    return env?.DEV === true;
  } catch {
    return false;
  }
}

/**
 * 获取环境变量
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  try {
    const env = (import.meta as unknown as Record<string, Record<string, string>>).env;
    return env?.[key] ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 写入认证前缀存储项（明文，非加密）
 */
export function setAuthItem(key: string, value: string, type: StorageType = 'localStorage'): void {
  try {
    const storage = type === 'localStorage' ? localStorage : sessionStorage;
    storage.setItem(`${AUTH_PREFIX}${key}`, value);
  } catch {
    console.warn(`Failed to set storage item: ${key}`);
  }
}

/**
 * 读取认证前缀存储项
 */
export function getAuthItem(key: string, type: StorageType = 'localStorage'): string | null {
  try {
    const storage = type === 'localStorage' ? localStorage : sessionStorage;
    return storage.getItem(`${AUTH_PREFIX}${key}`);
  } catch {
    console.warn(`Failed to get storage item: ${key}`);
    return null;
  }
}

/**
 * 移除认证前缀存储项
 */
export function removeAuthItem(key: string, type: StorageType = 'localStorage'): void {
  try {
    const storage = type === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem(`${AUTH_PREFIX}${key}`);
  } catch {
    console.warn(`Failed to remove storage item: ${key}`);
  }
}

/**
 * 清除所有认证相关数据
 */
export function clearAuthData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(AUTH_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(AUTH_PREFIX)) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    console.warn('Failed to clear auth data');
  }
}

/**
 * 存储健康检查
 */
export function storageHealthCheck(): { available: boolean; quotaExceeded: boolean } {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return { available: true, quotaExceeded: false };
  } catch (e) {
    const error = e as DOMException;
    return {
      available: false,
      quotaExceeded: error?.name === 'QuotaExceededError',
    };
  }
}

/**
 * 获取存储使用情况
 */
export function getStorageUsage(): { used: number; items: number } {
  let used = 0;
  let items = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(AUTH_PREFIX)) {
        const value = localStorage.getItem(key);
        used += (key.length + (value?.length ?? 0)) * 2;
        items++;
      }
    }
  } catch {
    // ignore
  }
  return { used, items };
}

export interface AuthStorageType extends StorageApi {
  setTenantId: (tenantId: string) => void;
  getTenantId: () => string | null;
  clearAll: () => void;
}

/**
 * 认证存储对象（便捷访问）
 */
export const authStorage: AuthStorageType = {
  setItem: (key, value, type) => setAuthItem(key, value, type),
  getItem: (key, type) => getAuthItem(key, type),
  removeItem: (key, type) => removeAuthItem(key, type),
  setTenantId: (tenantId) => setAuthItem('tenant_id', tenantId),
  getTenantId: () => getAuthItem('tenant_id'),
  clearAll: () => clearAuthData(),
};
