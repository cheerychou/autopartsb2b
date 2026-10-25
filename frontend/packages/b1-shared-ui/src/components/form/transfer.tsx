import * as React from 'react';
import { MagnifyingGlass, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "cn";
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { FormLabel } from './form-label';

export interface TransferItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface TransferProps {
  dataSource: TransferItem[];
  value?: string[];
  onChange?: (targetKeys: string[]) => void;
  targetKeys?: string[];
  titles?: [string, string];
  operations?: [string, string];
  showSearch?: boolean;
  filterOption?: (inputValue: string, item: TransferItem) => boolean;
  render?: (item: TransferItem) => React.ReactNode;
  listStyle?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  oneWay?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

const Transfer = React.forwardRef<HTMLDivElement, TransferProps>(
  ({
    dataSource,
    value,
    onChange,
    targetKeys: controlledTargetKeys,
    titles = ['源列表', '目标列表'],
    operations = ['移除', '添加'],
    showSearch = true,
    filterOption,
    render,
    listStyle,
    className,
    disabled = false,
    label,
    required,
    oneWay = false,
    pagination = false,
    pageSize = 10,
    ...props
  }, ref) => {
    const [selectedSourceKeys, setSelectedSourceKeys] = React.useState<string[]>([]);
    const [selectedTargetKeys, setSelectedTargetKeys] = React.useState<string[]>([]);
    const [sourceSearchValue, setSourceSearchValue] = React.useState('');
    const [targetSearchValue, setTargetSearchValue] = React.useState('');
    const [sourcePage, setSourcePage] = React.useState(1);
    const [targetPage, setTargetPage] = React.useState(1);

    const targetKeys = controlledTargetKeys || value || [];

    const handleSelectAll = (type: 'source' | 'target', checked: boolean) => {
      const currentKeys = type === 'source' ? selectedSourceKeys : selectedTargetKeys;
      const availableKeys = type === 'source'
        ? dataSource.filter(item => !targetKeys.includes(item.key) && !item.disabled).map(item => item.key)
        : dataSource.filter(item => targetKeys.includes(item.key) && !item.disabled).map(item => item.key);

      if (checked) {
        const newKeys = [...new Set([...currentKeys, ...availableKeys])];
        if (type === 'source') {
          setSelectedSourceKeys(newKeys);
        } else {
          setSelectedTargetKeys(newKeys);
        }
      } else {
        if (type === 'source') {
          setSelectedSourceKeys([]);
        } else {
          setSelectedTargetKeys([]);
        }
      }
    };

    const handleSelectItem = (type: 'source' | 'target', key: string, checked: boolean) => {
      if (type === 'source') {
        setSelectedSourceKeys(prev =>
          checked ? [...prev, key] : prev.filter(k => k !== key)
        );
      } else {
        setSelectedTargetKeys(prev =>
          checked ? [...prev, key] : prev.filter(k => k !== key)
        );
      }
    };

    const handleMoveToTarget = () => {
      const newTargetKeys = [...targetKeys, ...selectedSourceKeys];
      onChange?.(newTargetKeys);
      setSelectedSourceKeys([]);
    };

    const handleMoveToSource = () => {
      const newTargetKeys = targetKeys.filter(key => !selectedTargetKeys.includes(key));
      onChange?.(newTargetKeys);
      setSelectedTargetKeys([]);
    };

    const defaultFilterOption = (inputValue: string, item: TransferItem) => {
      return item.title.toLowerCase().includes(inputValue.toLowerCase());
    };

    const getFilteredDataSource = (type: 'source' | 'target') => {
      const searchValue = type === 'source' ? sourceSearchValue : targetSearchValue;
      const filter = filterOption || defaultFilterOption;

      return dataSource.filter(item => {
        const isTarget = targetKeys.includes(item.key);
        const matchesType = type === 'source' ? !isTarget : isTarget;
        const matchesSearch = !searchValue || filter(searchValue, item);
        return matchesType && matchesSearch;
      });
    };

    const getPaginatedDataSource = (items: TransferItem[], page: number) => {
      if (!pagination) return items;
      const start = (page - 1) * pageSize;
      return items.slice(start, start + pageSize);
    };

    const sourceData = getFilteredDataSource('source');
    const targetData = getFilteredDataSource('target');

    const paginatedSourceData = getPaginatedDataSource(sourceData, sourcePage);
    const paginatedTargetData = getPaginatedDataSource(targetData, targetPage);

    const isAllSelected = (type: 'source' | 'target') => {
      const currentKeys = type === 'source' ? selectedSourceKeys : selectedTargetKeys;
      const availableKeys = type === 'source'
        ? sourceData.filter(item => !item.disabled).map(item => item.key)
        : targetData.filter(item => !item.disabled).map(item => item.key);
      return availableKeys.length > 0 && availableKeys.every(key => currentKeys.includes(key));
    };

    const isIndeterminate = (type: 'source' | 'target') => {
      const currentKeys = type === 'source' ? selectedSourceKeys : selectedTargetKeys;
      const availableKeys = type === 'source'
        ? sourceData.filter(item => !item.disabled).map(item => item.key)
        : targetData.filter(item => !item.disabled).map(item => item.key);
      const selectedCount = availableKeys.filter(key => currentKeys.includes(key)).length;
      return selectedCount > 0 && selectedCount < availableKeys.length;
    };

    const renderList = (type: 'source' | 'target', data: TransferItem[], selectedKeys: string[], searchValue: string, setSearchValue: (value: string) => void, page: number, setPage: (page: number) => void) => {
      const allSelected = isAllSelected(type);
      const indeterminate = isIndeterminate(type);

      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(type, checked as boolean)}
                disabled={disabled}
                className={indeterminate ? 'data-indeterminate:bg-indeterminate-500' : ''}
              />
              <span className="text-sm font-medium">
                {type === 'source' ? titles[0] : titles[1]} ({data.length})
              </span>
            </div>
          </div>

          {showSearch && (
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
                disabled={disabled}
              />
            </div>
          )}

          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '300px' }}>
            {data.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                暂无数据
              </div>
            ) : (
              data.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors",
                    selectedKeys.includes(item.key) && "bg-muted",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={selectedKeys.includes(item.key)}
                    onCheckedChange={(checked) => handleSelectItem(type, item.key, checked as boolean)}
                    disabled={disabled || item.disabled}
                  />
                  <div className="flex-1 min-w-0">
                    {render ? render(item) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination && data.length > pageSize && (
            <div className="flex items-center justify-between border-t pt-2">
              <Button
                variant="outline"
               
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                }}
                disabled={disabled || page === 1}
              >
                <CaretLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                第 {page} 页 / 共 {Math.ceil(data.length / pageSize)} 页
              </span>
              <Button
                variant="outline"
               
                onClick={() => {
                  const newPage = Math.min(Math.ceil(data.length / pageSize), page + 1);
                  setPage(newPage);
                }}
                disabled={disabled || page >= Math.ceil(data.length / pageSize)}
              >
                <CaretRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {label && (
          <FormLabel required={required}>
            {label}
          </FormLabel>
        )}
        <div className="flex items-center gap-4">
          <div className="flex-1 rounded-lg border bg-card p-4" style={listStyle}>
            {renderList('source', paginatedSourceData, selectedSourceKeys, sourceSearchValue, setSourceSearchValue, sourcePage, setSourcePage)}
          </div>

          <div className="flex flex-col gap-2">
            {!oneWay && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleMoveToSource}
                disabled={disabled || selectedTargetKeys.length === 0}
                title={operations[0]}
              >
                <CaretLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleMoveToTarget}
              disabled={disabled || selectedSourceKeys.length === 0}
              title={operations[1]}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 rounded-lg border bg-card p-4" style={listStyle}>
            {renderList('target', paginatedTargetData, selectedTargetKeys, targetSearchValue, setTargetSearchValue, targetPage, setTargetPage)}
          </div>
        </div>
      </div>
    );
  }
);

Transfer.displayName = 'Transfer';

export { Transfer };
