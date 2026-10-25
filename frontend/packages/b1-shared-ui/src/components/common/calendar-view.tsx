import * as React from 'react';
import { Calendar as CalendarIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { Badge } from '../ui/badge';
import { DateToolbar } from './date-toolbar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 日历事件数据接口
 */
export interface CalendarEvent {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 开始时间 */
  startTime: Date | string;
  /** 结束时间（可选） */
  endTime?: Date | string;
  /** 事件颜色 */
  color?: string;
  /** 事件状态 */
  status?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 日历视图属性接口
 */
export interface CalendarViewProps {
  /** 事件列表 */
  events: CalendarEvent[];
  /** 当前日期（受控） */
  currentDate?: Date;
  /** 默认日期（非受控） */
  defaultDate?: Date;
  /** 选中的日期 */
  selectedDate?: Date;
  /** 日期变化回调 */
  onDateChange?: (date: Date) => void;
  /** 选中日期回调 */
  onSelectDate?: (date: Date) => void;
  /** 点击事件回调 */
  onEventClick?: (event: CalendarEvent) => void;
  /** 自定义事件渲染 */
  eventRenderer?: (event: CalendarEvent) => React.ReactNode;
  /** 自定义日期单元格渲染 */
  dateCellRenderer?: (date: Date, events: CalendarEvent[]) => React.ReactNode;
  /** 是否显示周末，默认为 true */
  showWeekends?: boolean;
  /** 一周开始日，0=周日，1=周一，默认为 1 */
  weekStartsOn?: 0 | 1;
  /** 是否只读，默认为 false */
  readOnly?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 头部自定义类名 */
  headerClassName?: string;
  /** 主体容器类名（覆盖内建 p-4 内边距，窄列场景用；tailwind-merge 后者胜） */
  bodyClassName?: string;
  /** 单元格自定义类名 */
  cellClassName?: string;
  /** 空状态内容 */
  emptyContent?: React.ReactNode;
  /** 事件最大显示数量，默认为 3 */
  maxEventDisplay?: number;
}

/**
 * 日历视图组件
 *
 * 用于展示按月视图排列的事件日历，支持事件点击、日期选择等功能
 *
 * @example
 * ```tsx
 * <CalendarView
 *   events={[
 *     { id: '1', title: '会议', startTime: new Date(), color: 'bg-primary' },
 *   ]}
 *   onEventClick={(event) => console.log(event)}
 * />
 * ```
 */
export function CalendarView({
  events,
  currentDate: controlledDate,
  defaultDate = new Date(),
  selectedDate,
  onDateChange,
  onSelectDate,
  onEventClick,
  eventRenderer,
  dateCellRenderer,
  showWeekends = true,
  weekStartsOn = 1,
  readOnly = false,
  loading = false,
  className,
  headerClassName,
  bodyClassName,
  cellClassName,
  emptyContent,
  maxEventDisplay = 3,
}: CalendarViewProps) {
  // 内部日期状态（非受控模式）
  const [internalDate, setInternalDate] = React.useState(defaultDate);
  const [internalSelectedDate, setInternalSelectedDate] = React.useState<Date | undefined>(
    selectedDate
  );

  // 使用受控或非受控日期
  const displayDate = controlledDate ?? internalDate;
  const displaySelectedDate = selectedDate ?? internalSelectedDate;

  // 处理日期变化
  const handleDateChange = (newDate: Date) => {
    if (controlledDate === undefined) {
      setInternalDate(newDate);
    }
    onDateChange?.(newDate);
  };

  // 处理日期选择
  const handleSelectDate = (date: Date) => {
    if (readOnly) return;
    if (selectedDate === undefined) {
      setInternalSelectedDate(date);
    }
    onSelectDate?.(date);
  };

  // 切换到上月
  const goToPreviousMonth = () => {
    handleDateChange(subMonths(displayDate, 1));
  };

  // 切换到下月
  const goToNextMonth = () => {
    handleDateChange(addMonths(displayDate, 1));
  };

  // 回到今天
  const goToToday = () => {
    const today = new Date();
    handleDateChange(today);
    handleSelectDate(today);
  };

  // 解析日期
  const parseDate = (date: Date | string): Date => {
    if (typeof date === 'string') {
      return parseISO(date);
    }
    return date;
  };

  // 获取日期对应的事件
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = parseDate(event.startTime);
      return isSameDay(eventDate, date);
    });
  };

  // 生成日历网格数据
  const generateCalendarDays = (): Date[] => {
    const monthStart = startOfMonth(displayDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // 获取星期标题
  const getWeekdayLabels = (): string[] => {
    const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (weekStartsOn === 1) {
      return [...labels.slice(1), labels[0]];
    }
    return labels;
  };

  const calendarDays = generateCalendarDays();
  const weekdayLabels = getWeekdayLabels();

  // 默认事件渲染
  const defaultEventRenderer = (event: CalendarEvent) => (
    <div
      key={event.id}
      className={cn(
        'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors',
        'hover:opacity-80',
        event.color || 'bg-primary/10 text-primary'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick?.(event);
      }}
      title={event.title}
    >
      {event.title}
    </div>
  );

  // 默认日期单元格渲染
  const defaultDateCellRenderer = (date: Date, dayEvents: CalendarEvent[]) => {
    const isCurrentMonth = isSameMonth(date, displayDate);
    const isSelected = displaySelectedDate && isSameDay(date, displaySelectedDate);
    const isTodayDate = isToday(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
      <div
        className={cn(
          'min-h-[80px] p-1 border border-border/50 transition-colors',
          !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
          isSelected && 'bg-primary/5 ring-2 ring-primary ring-inset',
          !readOnly && isCurrentMonth && 'hover:bg-muted/50 cursor-pointer',
          !showWeekends && isWeekend && 'hidden',
          cellClassName
        )}
        onClick={() => handleSelectDate(date)}
      >
        {/* 日期数字 */}
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
              isTodayDate && 'bg-primary text-primary-foreground',
              !isTodayDate && !isCurrentMonth && 'text-muted-foreground'
            )}
          >
            {format(date, 'd')}
          </span>
          {dayEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              {dayEvents.length}
            </Badge>
          )}
        </div>

        {/* 事件列表 */}
        <div className="flex flex-col gap-0.5">
          {dayEvents.slice(0, maxEventDisplay).map((event) =>
            eventRenderer ? eventRenderer(event) : defaultEventRenderer(event)
          )}
          {dayEvents.length > maxEventDisplay && (
            <div className="text-xs text-muted-foreground px-1.5">
              +{dayEvents.length - maxEventDisplay} 更多
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染加载骨架屏
  const renderSkeleton = () => (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, index) => (
        <div key={index} className="min-h-[80px] p-1 border border-border/50 bg-muted/20">
          <div className="w-6 h-6 bg-muted rounded-full mb-2" />
          <div className="space-y-1">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {emptyContent || (
        <>
          <CalendarIcon className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">暂无事件</p>
        </>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg border', className)}>
      {/* 头部工具栏：DateToolbar 标准件（制式对齐 [◀][今天][▶] 区间文本，ENG-FE-DESIGN-004 §3.3） */}
      <div className={cn('p-4 border-b', headerClassName)}>
        <DateToolbar
          label={format(displayDate, 'yyyy年MM月', { locale: zhCN })}
          unit="month"
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToday={goToToday}
        />
      </div>

      {/* 日历主体 */}
      <div className={cn('flex-1 overflow-auto p-4', bodyClassName)}>
        {loading ? (
          renderSkeleton()
        ) : events.length === 0 && !calendarDays.some((day) => getEventsForDate(day).length > 0) ? (
          renderEmpty()
        ) : (
          <div className="flex flex-col h-full">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdayLabels.map((label, index) => {
                const isWeekend = showWeekends && (index === 5 || index === 6);
                return (
                  <div
                    key={label}
                    className={cn(
                      'text-center text-sm font-medium py-2 text-muted-foreground whitespace-nowrap',
                      isWeekend && 'text-destructive'
                    )}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1 flex-1">
              {calendarDays.map((date) => {
                const dayEvents = getEventsForDate(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                if (!showWeekends && isWeekend) {
                  return null;
                }

                return (
                  <React.Fragment key={date.toISOString()}>
                    {dateCellRenderer
                      ? dateCellRenderer(date, dayEvents)
                      : defaultDateCellRenderer(date, dayEvents)}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
