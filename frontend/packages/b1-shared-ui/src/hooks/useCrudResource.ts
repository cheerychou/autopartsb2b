import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useMutateData } from './use-mutate-data';

/**
 * CRUD 资源状态 Hook（useCrudResource，ADT-ALL-004 §5.2）
 *
 * 收敛 data-platform 51 页逐字重复的 CRUD 状态机（create/update/delete
 * action union + 弹窗/编辑态/删除目标/表单受控值 ~50 行样板）为单一 Hook。
 *
 * 分层约定：
 * - **写操作**（本 hook 内部 useMutateData）：onCreate/onUpdate/onDelete
 *   由应用注入 service 调用；成功 toast + onSaved（如 list.refresh）统一触发；
 * - **弹窗状态机**：openCreate/openEdit/closeDialog + formData/setField 受控值；
 * - **删除确认**：requestDelete(item) → ConfirmDialog → confirmDelete()。
 *
 * @example
 * ```tsx
 * const crud = useCrudResource<TermAlias>({
 *   onCreate: (d) => dataPlatformService.termAliases.create(d),
 *   onUpdate: (id, d) => dataPlatformService.termAliases.update(id, d),
 *   onDelete: (id) => dataPlatformService.termAliases.delete(id),
 *   defaultValues: { aliasType: 'TRADE', status: 'active' },
 *   idKey: 'aliasId',
 *   onSaved: list.refresh,
 * });
 * ```
 */

/** 内部统一 action 形态（收敛各页手写 union，字段名与既有页面一致） */
export interface CrudAction {
  type: 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
  id?: string;
}

export interface CrudResourceOptions<T extends object> {
  onCreate: (data: Partial<T>) => Promise<unknown>;
  onUpdate: (id: string, data: Partial<T>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** openCreate 时重置的表单初始值 */
  defaultValues: Partial<T>;
  /** T 的主键字段名（dp 各页各异：termId/aliasId/standardId…），默认 'id' */
  idKey?: string;
  /** 保存/删除成功后的刷新回调（如 usePagedList 的 list.refresh） */
  onSaved?: () => void;
  /** 保存/删除成功后额外失效的 queryKey（透传 useMutateData，先于 onSaved 执行；替代页面直引 useQueryClient） */
  invalidateKeys?: unknown[][];
  /** 成功 toast 文案覆盖，默认 '操作成功' */
  successMessage?: string;
  /** 失败 toast 文案覆盖，默认 '操作失败'（还原各页原手写 mutation 的 onError toast，防保存失败静默） */
  errorMessage?: string;
}

export function useCrudResource<T extends object>(opts: CrudResourceOptions<T>) {
  const idKey = opts.idKey ?? 'id';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<T>>(opts.defaultValues);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const mutation = useMutateData({
    invalidateKeys: opts.invalidateKeys,
    mutationFn: async (action: CrudAction) => {
      if (action.type === 'create') return opts.onCreate(action.data as Partial<T>);
      if (action.type === 'update') return opts.onUpdate(action.id!, action.data as Partial<T>);
      return opts.onDelete(action.id!);
    },
    onSuccess: () => {
      toast.success(opts.successMessage ?? '操作成功');
      opts.onSaved?.();
    },
    onError: () => {
      toast.error(opts.errorMessage ?? '操作失败');
    },
  });

  const openCreate = useCallback(() => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(opts.defaultValues);
    setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  const openEdit = useCallback(
    (item: T) => {
      setIsEditMode(true);
      setEditingId(String((item as Record<string, unknown>)[idKey] ?? ''));
      setFormData({ ...item });
      setDialogOpen(true);
    },
    [idKey],
  );

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  /** 单字段受控赋值（收敛 `{ ...formData, [k]: v }` 展开样板） */
  const setField = useCallback(<K extends keyof T & string>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    try {
      if (isEditMode && editingId) {
        await mutation.mutateAsync({ type: 'update', id: editingId, data: formData as Record<string, unknown> });
      } else {
        await mutation.mutateAsync({ type: 'create', data: formData as Record<string, unknown> });
      }
      setDialogOpen(false);
    } catch {
      /* 错误提示由 onError toast 承载 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editingId, formData]);

  const requestDelete = useCallback((item: T) => setDeleteTarget(item), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const id = String((deleteTarget as Record<string, unknown>)[idKey] ?? '');
    mutation.mutate({ type: 'delete', id });
    setDeleteTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteTarget, idKey]);

  return {
    /** 新建/编辑弹窗 */
    dialogOpen,
    isEditMode,
    editingId,
    formData,
    setField,
    setFormData,
    openCreate,
    openEdit,
    closeDialog,
    /** 保存（内部区分 create/update，成功自动关弹窗） */
    save,
    saving: mutation.loading,
    /** 删除确认状态机 */
    deleteTarget,
    requestDelete,
    closeDelete,
    confirmDelete,
    deleting: mutation.loading,
  };
}
