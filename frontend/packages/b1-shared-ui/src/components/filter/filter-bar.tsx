import * as React from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "cn";

export type FilterType = 'input' | 'select';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  placeholder?: string;
}

export type FilterValue = string | number | undefined;

export interface FilterBarProps {
  fields: FilterField[];
  onSearch: (values: Record<string, FilterValue>) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * 通用筛选栏组件
 * 支持输入框和下拉选择，自动处理布局
 * @param fields - 筛选字段配置
 * @param onSearch - 查询回调
 * @param onReset - 重置回调
 * @param className - 自定义类名
 */
export function FilterBar({ 
  fields, 
  onSearch, 
  onReset, 
  className 
}: FilterBarProps) {
  const [values, setValues] = React.useState<Record<string, FilterValue>>({});

  const handleChange = (key: string, value: FilterValue) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(values);
  };

  const handleReset = () => {
    setValues({});
    onReset?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap rounded-lg border bg-card p-4 text-card-foreground shadow-sm", className)}>
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-2 w-full md:w-auto">
          {field.type === 'input' && (
            <div className="relative w-full md:w-[200px]">
              <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={field.placeholder || field.label}
                value={values[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
          )}

          {field.type === 'select' && (
            <select
              className="flex h-10 w-full md:w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              <option value="">{field.placeholder || `选择${field.label}`}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 ml-auto md:ml-0">
        <Button onClick={handleSearch}>
          <MagnifyingGlass className="h-4 w-4" />
          查询
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <X className="h-4 w-4" />
          重置
        </Button>
      </div>
    </div>
  );
}
