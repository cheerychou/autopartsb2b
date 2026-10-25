function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
}

function toSnake(s: string): string {
  // 防护（ADT-ALL-003 FEQ-04 专家复核补充）：全大写/数字/下划线键
  // （SKU、A1B2、HTTP_STATUS 等）是枚举/常量/编码类 map 键而非
  // camelCase 标识符——无差别改写会把 {SKU: ...} 破坏成 {_s_k_u: ...}
  if (/^[A-Z0-9_]+$/.test(s)) {
    return s;
  }
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Recursively transform object keys from snake_case to camelCase */
export function camelizeKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => camelizeKeys(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v)]),
    ) as unknown as T;
  }
  return obj as unknown as T;
}

/** Recursively transform object keys from camelCase to snake_case */
export function snakeizeKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeizeKeys(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toSnake(k), snakeizeKeys(v)]),
    ) as unknown as T;
  }
  return obj as unknown as T;
}
