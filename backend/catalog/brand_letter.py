"""品牌拼音首字母计算（EA-DA-020 §六遗留：导入时自动计算 brand_letter）。

约定（与 Phase 1 存量回填一致，实证样例）：
  英文名开头为 ASCII 字母 → 取英文名首字母（智己汽车/IM Motors→I、深蓝汽车/Deepal→D）
  品牌名本身 ASCII 字母开头 → 大写首字母（iCAR→I / ARCFOX极狐→A）
  CJK 开头       → pinyin 首字母（阿维塔→A / 华晨新日→H）
  数字开头       → '#'（212 / 3D Design / 555 / 777）
  其余/异常      → '#'（门店列表空字母排末尾）
pypinyin 缺失时不抛错（返回 '#' 兜底），避免阻断导入链路。
"""

from __future__ import annotations


def compute_brand_letter(brand_name: str, brand_name_en: str = "") -> str:
    # 1) 英文名（官方对外名，优先级最高：智己汽车/IM Motors→I）
    en = (brand_name_en or "").strip()
    if en and en[0].isascii() and en[0].isalpha():
        return en[0].upper()
    name = (brand_name or "").strip()
    if not name:
        return "#"
    first = name[0]
    # 2) 品牌名本身 ASCII 字母开头
    if first.isascii() and first.isalpha():
        return first.upper()
    # 3) 数字开头
    if first.isascii() and first.isdigit():
        return "#"
    # 4) CJK 拼音首字母
    try:
        from pypinyin import Style, lazy_pinyin

        py = lazy_pinyin(first, style=Style.FIRST_LETTER, errors="ignore")
        if py and py[0] and len(py[0]) == 1 and py[0].isascii() and py[0].isalpha():
            return py[0].upper()
    except ImportError:
        pass
    return "#"
