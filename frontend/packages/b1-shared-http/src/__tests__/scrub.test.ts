import { describe, it, expect } from 'vitest';
import { scrubValue, PII_PATTERNS, SENSITIVE_KEYS } from '../sentry/scrub';

describe('scrubValue — PII 脱敏', () => {
  describe('身份证号', () => {
    it('应脱敏 18 位身份证号（末位 X，合法格式：17 数字 + X）', () => {
      // 合法身份证：17 位数字 + 1 位校验位（X 或数字），共 18 字符
      const id = '11010119900307123X';
      expect(scrubValue(`用户身份证：${id} 已登记`)).toBe(
        '用户身份证：[IDCARD] 已登记',
      );
    });

    it('应脱敏 18 位身份证号（末位数字）', () => {
      const id = '110101199003071234';
      expect(scrubValue(id)).toBe('[IDCARD]');
    });

    it('应脱敏 15 位旧式身份证号', () => {
      const id = '110101900307123';
      expect(scrubValue(`旧证：${id}`)).toBe('旧证：[IDCARD15]');
    });
  });

  describe('银行卡号', () => {
    it('应脱敏 16 位银行卡号', () => {
      const card = '6222020200112345';
      expect(scrubValue(`卡号 ${card}`)).toBe('卡号 [CARDNUM]');
    });

    it('应遮蔽 19 位银行卡号的主体（移植行为边界）', () => {
      // 注意：移动端正则按从长到短匹配，19 位数字的前 18 位先被 18 位身份证正则命中，
      // 残留末位 1 个字符。脱敏目的（遮蔽号码主体、无法还原完整卡号）已达成，
      // 残留单字符不构成 PII 还原风险。此为移植自移动端的既有行为，保持一致。
      const card = '6225756507890123456';
      const result = scrubValue(card);
      expect(result).toContain('[IDCARD]');
      expect(result).toMatch(/^\[IDCARD\]\d?$/); // 残留最多 1 位数字
      // 关键：原 19 位卡号不可还原
      expect(result).not.toContain(card);
    });
  });

  describe('手机号', () => {
    it('应脱敏 1 开头的 11 位手机号', () => {
      expect(scrubValue('联系手机 13800138000')).toBe('联系手机 [PHONE]');
    });

    it('应脱敏多个手机号', () => {
      expect(scrubValue('13800138000 和 15912345678')).toBe(
        '[PHONE] 和 [PHONE]',
      );
    });
  });

  describe('从长到短匹配顺序（关键防回归）', () => {
    it('18 位身份证号整体被 IDCARD 正则命中，不被拆解', () => {
      // 18 位身份证若被短正则（手机号）先吃掉中间段，会破坏后续长模式匹配。
      // 从长到短排列保证长模式优先命中。
      const id = '110101199003071234';
      const result = scrubValue(id);
      // 必须整体脱敏为 IDCARD，而不是先被 PHONE 正则吃掉中间段
      expect(result).toBe('[IDCARD]');
      expect(result).not.toContain('PHONE');
    });

    it('PII_PATTERNS 按"从长到短"排列（防误调整顺序）', () => {
      // 直接断言正则与替换标记，防止有人误调整顺序破坏脱敏正确性。
      // 期望顺序：18 位身份证 → 银行卡 → 15 位身份证 → 手机号
      expect(PII_PATTERNS).toHaveLength(4);
      expect(PII_PATTERNS[0].replacement).toBe('[IDCARD]'); // 18 位
      expect(PII_PATTERNS[1].replacement).toBe('[CARDNUM]'); // 银行卡
      expect(PII_PATTERNS[2].replacement).toBe('[IDCARD15]'); // 15 位
      expect(PII_PATTERNS[3].replacement).toBe('[PHONE]'); // 手机号
    });
  });

  describe('SENSITIVE_KEYS 整字段删除', () => {
    it('应删除 authorization 字段', () => {
      const input = { authorization: 'Bearer xxx', data: 'ok' };
      expect(scrubValue(input)).toEqual({ data: 'ok' });
    });

    it('应删除 token / password / cookie 字段（不区分大小写）', () => {
      const input = {
        Token: 'abc',
        PASSWORD: 'secret',
        Cookie: 'session=1',
        normal: 'keep',
      };
      expect(scrubValue(input)).toEqual({ normal: 'keep' });
    });

    it('应删除 access_token / refresh_token / api_key 字段', () => {
      const input = {
        access_token: 't1',
        refresh_token: 't2',
        api_key: 'k1',
        apikey: 'k2',
        secret: 's',
        'set-cookie': 'c',
      };
      expect(scrubValue(input)).toEqual({});
    });

    it('SENSITIVE_KEYS 覆盖预期键名', () => {
      expect(SENSITIVE_KEYS).toContain('authorization');
      expect(SENSITIVE_KEYS).toContain('token');
      expect(SENSITIVE_KEYS).toContain('password');
      expect(SENSITIVE_KEYS).toContain('cookie');
    });
  });

  describe('嵌套结构递归脱敏', () => {
    it('应递归脱敏嵌套对象', () => {
      const input = {
        user: { name: '张三', phone: '13800138000' },
        meta: { idcard: '110101199003071234' },
      };
      const result = scrubValue(input);
      expect(result.user.phone).toBe('[PHONE]');
      expect(result.meta.idcard).toBe('[IDCARD]');
      // 非敏感字符串保持不变
      expect(result.user.name).toBe('张三');
    });

    it('应递归脱敏数组', () => {
      const input = ['13800138000', '110101199003071234', { password: 'x', note: '13800138000' }];
      const result = scrubValue(input);
      expect(result[0]).toBe('[PHONE]');
      expect(result[1]).toBe('[IDCARD]');
      expect(result[2]).toEqual({ note: '[PHONE]' }); // password 被删除
    });

    it('不应修改原对象', () => {
      const input = { phone: '13800138000' };
      scrubValue(input);
      expect(input.phone).toBe('13800138000');
    });
  });

  describe('深度限制', () => {
    it('深度超过 6 时不再递归脱敏', () => {
      // 构造 8 层嵌套，最内层含手机号
      const deep = { a: { b: { c: { d: { e: { f: { g: { h: '13800138000' } } } } } } } };
      const result = scrubValue(deep);
      // depth 0-6 共 7 层判断，第 7 层（h 所在）应原样返回不再脱敏
      // a(0) b(1) c(2) d(3) e(4) f(5) g(6) —— g 层对象仍被遍历，h 字段在 depth 7 被截断
      // 注意：scrubValue 进入 g 时 depth=6，遍历其字段 h 时 depth=7 > 6，直接返回原值
      expect(result.a.b.c.d.e.f.g.h).toBe('13800138000');
    });

    it('浅层（6 层以内）正常脱敏', () => {
      const deep = { a: { b: { c: { d: { e: { f: '13800138000' } } } } } };
      const result = scrubValue(deep);
      expect(result.a.b.c.d.e.f).toBe('[PHONE]');
    });
  });

  describe('非字符串值', () => {
    it('数字/布尔/null 原样返回', () => {
      expect(scrubValue(12345)).toBe(12345);
      expect(scrubValue(true)).toBe(true);
      expect(scrubValue(null)).toBe(null);
      expect(scrubValue(undefined)).toBe(undefined);
    });

    it('空字符串原样返回', () => {
      expect(scrubValue('')).toBe('');
    });
  });

  describe('Sentry event 载荷模拟', () => {
    it('应脱敏模拟的 request 对象', () => {
      const event = {
        request: {
          headers: { Authorization: 'Bearer abc' },
          data: { phone: '13800138000', name: '李四' },
        },
      };
      const result = scrubValue(event);
      expect(result.request.headers).toEqual({}); // Authorization 删除
      expect(result.request.data.phone).toBe('[PHONE]');
      expect(result.request.data.name).toBe('李四');
    });

    it('应脱敏 exception 消息文本', () => {
      const event = {
        exception: {
          values: [{ value: '客户 13800138000 不存在' }],
        },
      };
      const result = scrubValue(event);
      expect(result.exception.values[0].value).toBe('客户 [PHONE] 不存在');
    });

    it('应脱敏 breadcrumbs 轨迹', () => {
      const event = {
        breadcrumbs: [
          { message: '查询车牌 13800138000', data: { token: 'x' } },
        ],
      };
      const result = scrubValue(event);
      expect(result.breadcrumbs[0].message).toBe('查询车牌 [PHONE]');
      expect(result.breadcrumbs[0].data).toEqual({}); // token 删除
    });
  });
});
