import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../form/textarea';
import { FormLabel } from '../form/form-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../form/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

/** 字段描述符（ADT-ALL-004 §5.2 配置驱动弹窗） */
export interface CrudFieldDescriptor {
  /** 对应 formData 的键 */
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select';
  /** 标题星号提示（校验仍由应用侧负责） */
  required?: boolean;
  placeholder?: string;
  /** select 类型的选项 */
  options?: { label: string; value: string }[];
  /** 栅格跨度：2 = 整行，默认半宽 */
  span?: 1 | 2;
}

export interface CrudFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true=编辑（按钮「更新」），false=新建（按钮「创建」） */
  isEditMode: boolean;
  title: string;
  fields: CrudFieldDescriptor[];
  /** 受控表单值（与 useCrudResource.formData 直连） */
  formData: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  /** 传给 DialogContent 的额外类（默认 max-w-2xl 滚动壳） */
  contentClassName?: string;
}

/**
 * CRUD 新建/编辑弹窗（CrudFormDialog，ADT-ALL-004 §5.2）
 *
 * 配置驱动（CrudFieldDescriptor[]）替代 dp 各页逐字重复的手写
 * Dialog+FormLabel+Input/Select 受控段；两列栅格，select/textarea/
 * number/date 内置分派。复杂定制字段（级联、上传等）仍用裸 Dialog。
 */
export function CrudFormDialog({
  open,
  onOpenChange,
  isEditMode,
  title,
  fields,
  formData,
  onFieldChange,
  onSave,
  saving = false,
  contentClassName,
}: CrudFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName ?? 'max-w-2xl max-h-[90vh] overflow-y-auto'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {fields.map((f) => {
            const value = formData[f.key];
            const str = value === undefined || value === null ? '' : String(value);
            return (
              <div
                key={f.key}
                className={`flex flex-col gap-2 ${f.span === 2 ? 'col-span-2' : ''}`}
              >
                <FormLabel>
                  {f.label}
                  {f.required ? ' *' : ''}
                </FormLabel>
                {f.type === 'textarea' ? (
                  <Textarea
                    className="min-h-[60px]"
                    value={str}
                    placeholder={f.placeholder}
                    onChange={(e) => onFieldChange(f.key, e.target.value)}
                  />
                ) : f.type === 'select' ? (
                  <Select value={str} onValueChange={(v) => onFieldChange(f.key, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={f.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={str}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      onFieldChange(f.key, f.type === 'number' ? e.target.value : e.target.value)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {isEditMode ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
