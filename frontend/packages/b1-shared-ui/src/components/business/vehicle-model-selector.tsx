/**
 * 车型选择器 — 品牌→车系→车型三级联动（共享业务组件，数据源注入式）
 *
 * 上收自 store-web（原 components/vehicles/VehicleModelSelector.tsx），V2 泛化点：
 *   - 数据源注入：`sources` props 提供 fetchBrands/fetchSeries/fetchModels（库内零 API 依赖，
 *     消费方传绑定方法即可，如 dataPlatformService.listBrands）
 *   - 受控回显：`value` 支持完整选择（含 id，直接定位）或仅名称（跨会话草稿，按名称匹配链
 *     渐进回显：品牌内存匹配 → 车系双形态匹配（裸名/导入压扁串「品牌+车系」）→ 车型名称匹配）
 *   - A-Z 拼音锚点导航：品牌列左侧字母栏（brandLetter 服务端回填），点击 scrollToIndex
 *     到分组头，滚动时按可视区起点（range.startIndex，不含 overscan）反推当前字母高亮
 *   - 虚拟滚动保留（品牌 500+/车系/车型数百行仅渲染可见行）；行高类名钉死（header h-6 /
 *     item h-8）保证估算=真实、锚点定位不漂
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from "cn";
import { EmptyState } from "../ui/empty-state";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { Icons } from "../ui/icons";
import logger from "../../logger";

/** 选择结果（消费方通常只取 *Name 字符串回写表单） */
export interface VehicleModelSelection {
  brandId: string;
  brandName: string;
  seriesId: string;
  seriesName: string;
  modelId: string;
  modelName: string;
  modelCode: string;
  guidePrice?: number;
  techSpecs?: Partial<VehicleModel>;
}

/** 三级数据结构（结构化子集，消费方数据类型结构兼容即可直传） */
export interface VehicleBrand {
  brandId: string;
  brandCode?: string;
  brandName: string;
  brandNameEn?: string;
  /** 拼音首字母（服务端回填，导入时自动计算）；缺失时组件退品牌名首字符 */
  brandLetter?: string;
}

export interface VehicleSeries {
  seriesId: string;
  seriesCode?: string;
  seriesName: string;
  brandId?: string;
  brandName?: string;
}

export interface VehicleModel {
  modelId: string;
  modelCode?: string;
  modelName: string;
  brandId?: string;
  brandName?: string;
  seriesId?: string;
  seriesName?: string;
  guidePrice?: number;
  modelYearDisplay?: string;
  engineConfigDisplay?: string;
  transConfigDisplay?: string;
  driveConfigDisplay?: string;
  wheelbaseMm?: number;
  lengthMm?: number;
  curbWeightKg?: number;
  safetyFeatures?: Record<string, string> | null;
  comfortFeatures?: Record<string, string> | null;
}

/** 分页返回（消费方分页结构只需含 results） */
export interface VehicleModelPage<T> {
  results: T[];
  count?: number;
  next?: unknown;
  previous?: unknown;
}

/** 数据源注入：库内零 API 依赖，消费方传绑定方法 */
export interface VehicleModelSources {
  fetchBrands: (params?: Record<string, unknown>) => Promise<VehicleModelPage<VehicleBrand>>;
  fetchSeries: (params: Record<string, unknown>) => Promise<VehicleModelPage<VehicleSeries>>;
  fetchModels: (params: Record<string, unknown>) => Promise<VehicleModelPage<VehicleModel>>;
}

export interface VehicleModelSelectorProps {
  /** 受控回显：完整选择（含 id）直接定位；仅名称时按名称匹配链渐进回显 */
  value?: Partial<VehicleModelSelection> | null;
  onChange?: (selection: VehicleModelSelection) => void;
  /** 三级数据源（必填） */
  sources: VehicleModelSources;
  /** 是否展示技术参数迷你卡片 */
  showTechSpecs?: boolean;
  className?: string;
}

/** 装备标签名映射 */
const FEATURE_TAGS: Record<string, string> = {
  esp: 'ESP', abs: 'ABS', sunroof: '天窗', led_headlights: 'LED大灯',
  cruise_control: '定速巡航', keyless_entry: '无钥匙进入', leather_steering_wheel: '真皮方向盘',
  auto_ac: '自动空调', carplay: 'CarPlay', parking_radar: '倒车雷达',
};

/** 去掉导入压扁串里的品牌前缀（「品牌名[-/·]车系名」→ 车系裸名），供回显双形态匹配 */
function stripBrandPrefix(seriesName: string, brandName: string): string {
  if (brandName && seriesName.startsWith(brandName)) {
    return seriesName.slice(brandName.length).replace(/^[-\s·]+/, '') || seriesName;
  }
  return seriesName;
}

export function VehicleModelSelector({
  value,
  onChange,
  sources,
  showTechSpecs = true,
  className,
}: VehicleModelSelectorProps) {
  // sources 引用进 ref：消费方传内联对象也不触发数据重载
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  // 三级数据
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [series, setSeries] = useState<VehicleSeries[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);

  // 选中状态（受控回显与用户点选共用）
  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<VehicleSeries | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);

  // UI 状态
  const [loading, setLoading] = useState(false);
  const [brandsError, setBrandsError] = useState(false);

  /** 加载品牌（挂载一次；失败置错误态供重试） */
  const loadBrands = useCallback(() => {
    setLoading(true);
    setBrandsError(false);
    sourcesRef.current.fetchBrands({ page_size: 500, brand_type: 'M' }) // 只出整车厂（M）
      .then(d => setBrands(d.results || []))
      .catch((e) => { logger.warn('车型选择器：品牌数据加载失败', e); setBrands([]); setBrandsError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  /** 加载车系（返回列表供回显链复用） */
  const loadSeries = useCallback((brandId: string) => {
    setLoading(true);
    setSeries([]);
    setModels([]);
    return sourcesRef.current.fetchSeries({ brand_id: brandId, page_size: 200 })
      .then(d => { const list = d.results || []; setSeries(list); return list; })
      .catch((e) => { logger.warn('车型选择器：车系数据加载失败', e); setSeries([]); return []; })
      .finally(() => setLoading(false));
  }, []);

  /** 加载车型（返回列表供回显链复用） */
  const loadModels = useCallback((seriesId: string) => {
    setLoading(true);
    setModels([]);
    return sourcesRef.current.fetchModels({ series_id: seriesId, page_size: 200 })
      .then(d => { const list = d.results || []; setModels(list); return list; })
      .catch((e) => { logger.warn('车型选择器：车型数据加载失败', e); setModels([]); return []; })
      .finally(() => setLoading(false));
  }, []);

  /** 选中品牌 */
  const handleBrandClick = (b: VehicleBrand) => {
    setSelectedBrand(b);
    setSelectedSeries(null);
    setSelectedModel(null);
    loadSeries(b.brandId);
  };

  /** 选车系 */
  const handleSeriesClick = (s: VehicleSeries) => {
    setSelectedSeries(s);
    setSelectedModel(null);
    loadModels(s.seriesId);
  };

  /** 选车型 */
  const handleModelClick = (m: VehicleModel) => {
    setSelectedModel(m);
    // 车系对外一律给裸名（数据层存裸名原则）：点选行名可能是导入压扁串「品牌+车系」，剥前缀兜底
    const seriesBare = selectedSeries
      ? stripBrandPrefix(selectedSeries.seriesName, selectedBrand?.brandName || '')
      : '';
    onChange?.({
      brandId: m.brandId ?? selectedBrand?.brandId ?? '',
      brandName: m.brandName ?? selectedBrand?.brandName ?? '',
      seriesId: m.seriesId ?? selectedSeries?.seriesId ?? '',
      seriesName: seriesBare || m.seriesName || '',
      modelId: m.modelId,
      modelName: m.modelName,
      modelCode: m.modelCode ?? '',
      guidePrice: m.guidePrice,
      techSpecs: m,
    });
  };

  // ---- 受控回显：一次性名称匹配链（渐进回显，失败静默）----
  const resolvedKeyRef = useRef('');
  const brandId = value?.brandId ?? '';
  const brandName = value?.brandName ?? '';
  const seriesId = value?.seriesId ?? '';
  const seriesName = value?.seriesName ?? '';
  const modelId = value?.modelId ?? '';
  const modelName = value?.modelName ?? '';
  useEffect(() => {
    if (!brandId && !brandName) return; // 无 value / 空值不解析
    const key = `${brandId}|${brandName}|${seriesId}|${seriesName}|${modelId}|${modelName}`;
    if (resolvedKeyRef.current === key) return; // 幂等：重渲染不重发请求
    if (!brands.length) return; // 品牌未就绪，等 brands 到位后本 effect 重跑
    const ctrl = new AbortController();
    (async () => {
      let brand = brandId ? brands.find(b => b.brandId === brandId) : undefined;
      if (!brand && brandName) brand = brands.find(b => b.brandName === brandName);
      if (!brand) { resolvedKeyRef.current = key; return; } // 渐进：匹配不到不高亮不报错
      setSelectedBrand(brand);
      const seriesList = await loadSeries(brand.brandId);
      if (ctrl.signal.aborted) return;
      let s = seriesId ? seriesList.find(x => x.seriesId === seriesId) : undefined;
      if (!s && seriesName) {
        // 双形态：表单存裸名；车型行冗余 series_name 可能是「品牌+车系」压扁串
        s = seriesList.find(x =>
          x.seriesName === seriesName
          || x.seriesName === `${brand!.brandName}${seriesName}`
          || stripBrandPrefix(x.seriesName, brand!.brandName) === seriesName);
      }
      if (s) setSelectedSeries(s);
      const modelList = s ? await loadModels(s.seriesId) : [];
      if (ctrl.signal.aborted) return;
      let m = modelId ? modelList.find(x => x.modelId === modelId) : undefined;
      if (!m && modelName) m = modelList.find(x => x.modelName === modelName);
      if (m) setSelectedModel(m);
      resolvedKeyRef.current = key;
    })().catch((e) => { logger.warn('车型选择器：受控回显解析失败', e); });
    return () => ctrl.abort();
  }, [brandId, brandName, seriesId, seriesName, modelId, modelName, brands, loadSeries, loadModels]);

  // ---- 字母分组 ----
  // 品牌定位走 A-Z 字母导航（搜索框已移除：面板容器的防 blur preventDefault 会
  // 阻止内部输入框获得焦点，搜索框不可用；A-Z 锚点已覆盖快速定位需求）

  /** 品牌按首字母分组（brandLetter 服务端回填；缺失退首字符） */
  const groupedBrands = useMemo(() => brands.reduce<Record<string, VehicleBrand[]>>((acc, b) => {
    const first = (b.brandLetter || (b.brandName || '?')[0]).toUpperCase();
    if (!acc[first]) acc[first] = [];
    acc[first].push(b);
    return acc;
  }, {}), [brands]);
  const brandLetters = useMemo(() => Object.keys(groupedBrands).sort(), [groupedBrands]);

  // ---- 虚拟化（品牌 500+/车系 200+/车型 200+ 行，仅渲染可见行）----
  const brandScrollRef = useRef<HTMLDivElement>(null);
  const seriesScrollRef = useRef<HTMLDivElement>(null);
  const modelScrollRef = useRef<HTMLDivElement>(null);

  // 品牌行展平：字母标题作为特殊行混入线性列表，保持分组视觉
  const brandRows = useMemo(() => {
    const rows: Array<{ type: 'header'; letter: string } | { type: 'item'; brand: VehicleBrand }> = [];
    brandLetters.forEach(letter => {
      rows.push({ type: 'header', letter });
      (groupedBrands[letter] ?? []).forEach(b => rows.push({ type: 'item', brand: b }));
    });
    return rows;
  }, [brands, groupedBrands, brandLetters]);

  // 字母锚点映射：字母 → 分组头行号；行号 → 所属字母（前缀数组）
  const headerIndexByLetter = useMemo(() => {
    const map: Record<string, number> = {};
    brandRows.forEach((r, i) => { if (r.type === 'header' && map[r.letter] == null) map[r.letter] = i; });
    return map;
  }, [brandRows]);
  const letterByRow = useMemo(() => {
    const arr: string[] = [];
    let cur = '';
    for (const r of brandRows) { if (r.type === 'header') cur = r.letter; arr.push(cur); }
    return arr;
  }, [brandRows]);

  const brandVirtualizer = useVirtualizer({
    count: brandRows.length,
    getScrollElement: () => brandScrollRef.current,
    estimateSize: (i) => brandRows[i].type === 'header' ? 24 : 32,
    overscan: 6,
  });
  const seriesVirtualizer = useVirtualizer({
    count: series.length,
    getScrollElement: () => seriesScrollRef.current,
    estimateSize: () => 32,
    overscan: 6,
  });
  const modelVirtualizer = useVirtualizer({
    count: models.length,
    getScrollElement: () => modelScrollRef.current,
    estimateSize: () => 52, // 车型行含名称+参数两行，约 52px
    overscan: 6,
  });

  // ---- A-Z 锚点导航 ----
  // 点击字母 → scrollToIndex 到分组头；点击后短暂锁定高亮（末尾字母滚动被 clamp 时
  // 可视区起点落在上一组，锁定期内高亮保持点击字母，1s 后还原为滚动推导）
  const [clickedLetter, setClickedLetter] = useState<{ letter: string; at: number } | null>(null);
  const clickLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLetterClick = (letter: string) => {
    const idx = headerIndexByLetter[letter];
    if (idx == null) return;
    brandVirtualizer.scrollToIndex(idx, { align: 'start' });
    setClickedLetter({ letter, at: Date.now() });
    if (clickLockTimer.current) clearTimeout(clickLockTimer.current);
    clickLockTimer.current = setTimeout(() => setClickedLetter(null), 1000);
  };
  useEffect(() => () => { if (clickLockTimer.current) clearTimeout(clickLockTimer.current); }, []);

  // 当前高亮字母：range.startIndex（可视区起点，不含 overscan）向前回溯所属字母
  const rangeStart = brandVirtualizer.range?.startIndex ?? 0;
  const activeLetter = clickedLetter?.letter ?? letterByRow[rangeStart] ?? '';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* 面包屑 */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <span className="text-muted-foreground">已选：</span>
        {selectedBrand ? (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { setSelectedBrand(null); setSelectedSeries(null); }}>
            {selectedBrand.brandName}
          </Badge>
        ) : <span className="text-muted-foreground">品牌</span>}
        {selectedBrand && <span className="text-muted-foreground">›</span>}
        {selectedSeries ? (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { setSelectedSeries(null); setSelectedModel(null); }}>
            {selectedSeries.seriesName}
          </Badge>
        ) : selectedBrand ? <span className="text-muted-foreground">车系</span> : null}
        {selectedSeries && <span className="text-muted-foreground">›</span>}
        {selectedModel && <Badge variant="default">{selectedModel.modelName}</Badge>}
      </div>

      {/* 三级选择区（面板加高保证字母导航栏每字母 ≥15px 点选高度，不挤压） */}
      <div className="grid grid-cols-3 gap-3 border rounded-lg bg-card min-h-[420px]">
        {/* 品牌列（虚拟化 + A-Z 锚点导航栏）*/}
        <div className="h-[420px] border-r flex flex-col">
          <div className="text-xs font-medium text-muted-foreground px-3 py-1 border-b shrink-0">品牌</div>
          <div className="flex-1 flex min-h-0">
            {/* 字母导航栏（只渲染有品牌的字母；点选滚动定位，当前可视区字母高亮） */}
            {brandLetters.length > 0 && (
              <div className="w-7 shrink-0 flex flex-col items-center justify-center border-r bg-muted/30 select-none" data-testid="letter-rail">
                {brandLetters.map(letter => (
                  <button
                    key={letter}
                    type="button"
                    className={cn(
                      'w-6 h-[15px] shrink-0 flex items-center justify-center text-[11px] leading-none text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer',
                      activeLetter === letter && 'bg-primary/10 text-primary font-bold',
                    )}
                    onClick={() => handleLetterClick(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}
            <div ref={brandScrollRef} className="flex-1 overflow-auto min-w-0">
              <div className="p-2 relative" style={{ height: brandVirtualizer.getTotalSize() }}>
                {loading && !brands.length ? (
                  <div className="p-4 flex justify-center"><Spinner className="size-5" /></div>
                ) : brandsError && !brands.length ? (
                  <EmptyState
                    size="sm"
                    title="品牌数据加载失败"
                    description="网络异常或数据服务不可用"
                    action={{ label: '重试', onClick: loadBrands, variant: 'outline' }}
                  />
                ) : !brands.length ? (
                  <EmptyState size="sm" title="暂无品牌数据" />
                ) : (
                  brandVirtualizer.getVirtualItems().map(virtualRow => {
                    const row = brandRows[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 w-full px-2"
                        style={{ top: virtualRow.start }}
                      >
                        {row.type === 'header' ? (
                          <div className="h-6 text-xs text-muted-foreground font-bold px-2 py-0.5 bg-background flex items-center">
                            {row.letter}
                          </div>
                        ) : (
                          <div
                            data-testid={`brand-${row.brand.brandId}`}
                            className={cn(
                              'h-8 flex items-center gap-2 px-3 rounded cursor-pointer text-sm hover:bg-accent',
                              selectedBrand?.brandId === row.brand.brandId && 'bg-primary/10 text-primary font-medium',
                            )}
                            onClick={() => handleBrandClick(row.brand)}
                          >
                            <span className="truncate flex-1">{row.brand.brandName}</span>
                            {selectedBrand?.brandId === row.brand.brandId && <Icons.Check size={14} />}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 车系列（虚拟化）*/}
        <div className="h-[420px] border-r flex flex-col">
          <div className="text-xs font-medium text-muted-foreground px-3 py-1 border-b shrink-0">车系</div>
          <div ref={seriesScrollRef} className="flex-1 overflow-auto">
            <div className="p-2 relative" style={{ height: seriesVirtualizer.getTotalSize() }}>
              {!selectedBrand ? (
                <div className="text-sm text-muted-foreground p-4">← 请先选择品牌</div>
              ) : loading ? (
                <div className="p-4 flex justify-center"><Spinner className="size-5" /></div>
              ) : series.length === 0 ? (
                <EmptyState size="sm" title="暂无车系" />
              ) : (
                seriesVirtualizer.getVirtualItems().map(virtualRow => {
                  const s = series[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      className="absolute left-0 w-full px-2"
                      style={{ top: virtualRow.start }}
                    >
                      <div
                        data-testid={`series-${s.seriesId}`}
                        className={cn(
                          'h-8 flex items-center gap-2 px-3 rounded cursor-pointer text-sm hover:bg-accent',
                          selectedSeries?.seriesId === s.seriesId && 'bg-primary/10 text-primary font-medium',
                        )}
                        onClick={() => handleSeriesClick(s)}
                      >
                        <span className="truncate flex-1">
                          {selectedBrand ? stripBrandPrefix(s.seriesName, selectedBrand.brandName) : s.seriesName}
                        </span>
                        {selectedSeries?.seriesId === s.seriesId && <Icons.Check size={14} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 车型列（虚拟化）*/}
        <div className="h-[420px] flex flex-col">
          <div className="text-xs font-medium text-muted-foreground px-3 py-1 border-b shrink-0">车型</div>
          <div ref={modelScrollRef} className="flex-1 overflow-auto">
            <div className="p-2 relative" style={{ height: modelVirtualizer.getTotalSize() }}>
              {!selectedSeries ? (
                <div className="text-sm text-muted-foreground p-4">← 请先选择车系</div>
              ) : loading ? (
                <div className="p-4 flex justify-center"><Spinner className="size-5" /></div>
              ) : models.length === 0 ? (
                <EmptyState size="sm" title="暂无车型数据" />
              ) : (
                modelVirtualizer.getVirtualItems().map(virtualRow => {
                  const m = models[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      className="absolute left-0 w-full px-2"
                      style={{ top: virtualRow.start }}
                    >
                      <div
                        data-testid={`model-${m.modelId}`}
                        className={cn(
                          'flex flex-col px-3 py-2 rounded cursor-pointer hover:bg-accent',
                          selectedModel?.modelId === m.modelId && 'bg-primary/10',
                        )}
                        onClick={() => handleModelClick(m)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm truncate flex-1', selectedModel?.modelId === m.modelId && 'text-primary font-medium')}>
                            {m.modelName}
                          </span>
                          {selectedModel?.modelId === m.modelId && <Icons.Check size={14} className="text-primary shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {m.guidePrice ? <span>¥{m.guidePrice}万</span> : null}
                          {m.modelYearDisplay ? <span>{m.modelYearDisplay}</span> : null}
                          {m.engineConfigDisplay ? <span className="truncate">{m.engineConfigDisplay}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 技术参数迷你卡片 */}
      {showTechSpecs && selectedModel && (
        <div className="border rounded-lg p-3 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Vehicle size={18} className="text-primary" />
            <span className="font-medium text-sm">{selectedModel.modelName}</span>
            <span className="text-xs text-muted-foreground">
              {selectedBrand?.brandName || selectedModel.brandName} · {selectedSeries?.seriesName || selectedModel.seriesName}
            </span>
            {selectedModel.guidePrice && (
              <Badge variant="default" className="ml-auto">¥{selectedModel.guidePrice}万</Badge>
            )}
          </div>

          {/* 车身参数行 */}
          <div className="grid grid-cols-6 gap-2 text-xs mb-2">
            {selectedModel.wheelbaseMm && (
              <div><span className="text-muted-foreground">轴距</span><p className="font-medium">{selectedModel.wheelbaseMm}mm</p></div>
            )}
            {selectedModel.lengthMm && (
              <div><span className="text-muted-foreground">车长</span><p className="font-medium">{selectedModel.lengthMm}mm</p></div>
            )}
            {selectedModel.curbWeightKg && (
              <div><span className="text-muted-foreground">整备质量</span><p className="font-medium">{selectedModel.curbWeightKg}kg</p></div>
            )}
            {selectedModel.engineConfigDisplay && (
              <div><span className="text-muted-foreground">发动机</span><p className="font-medium truncate">{selectedModel.engineConfigDisplay}</p></div>
            )}
            {selectedModel.transConfigDisplay && (
              <div><span className="text-muted-foreground">变速箱</span><p className="font-medium">{selectedModel.transConfigDisplay}</p></div>
            )}
            {selectedModel.driveConfigDisplay && (
              <div><span className="text-muted-foreground">驱动</span><p className="font-medium">{selectedModel.driveConfigDisplay}</p></div>
            )}
          </div>

          {/* 装备标签 */}
          {(selectedModel.safetyFeatures || selectedModel.comfortFeatures) && (
            <div className="flex flex-wrap gap-1">
              {Object.entries({ ...(selectedModel.safetyFeatures || {}), ...(selectedModel.comfortFeatures || {}) })
                .filter(([, v]) => v?.includes('●'))
                .slice(0, 12)
                .map(([k]) => (
                  <Badge key={k} variant="outline" className="text-xs bg-success-soft text-success border-success-soft">
                    {FEATURE_TAGS[k] || k}
                  </Badge>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
