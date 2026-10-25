import { describe, it, expect } from 'vitest';
import { camelizeKeys, snakeizeKeys } from '../case-transform';

describe('case-transform', () => {
  describe('snakeizeKeys 大写键防护（ADT-ALL-003 FEQ-04 专家复核）', () => {
    it('全大写常量键原样保留（不被破坏成 _s_k_u）', () => {
      const input = { SKU: 'A1B2', HTTP_STATUS: 200 };
      expect(snakeizeKeys(input)).toEqual({ SKU: 'A1B2', HTTP_STATUS: 200 });
    });

    it('正常 camelCase 键照常转换', () => {
      expect(snakeizeKeys({ userName: 'x', createdAt: 1 })).toEqual({
        user_name: 'x',
        created_at: 1,
      });
    });

    it('已有 snake_case 键不变', () => {
      expect(snakeizeKeys({ user_name: 'x' })).toEqual({ user_name: 'x' });
    });

    it('嵌套结构与数组递归时防护同样生效', () => {
      const input = { items: [{ SKU: 's1', unitPrice: 2 }] };
      expect(snakeizeKeys(input)).toEqual({
        items: [{ SKU: 's1', unit_price: 2 }],
      });
    });
  });

  describe('camelizeKeys 幂等性（冗余而非干扰的实证）', () => {
    it('对已 camel 的键幂等', () => {
      expect(camelizeKeys({ userName: 'x' })).toEqual({ userName: 'x' });
    });
  });
});
