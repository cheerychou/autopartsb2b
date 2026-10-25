import * as React from 'react';
import { cn } from "cn";
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { addDays, format } from 'date-fns';

/**
 * 天数卡片事件数据接口
 */
export interface DaysCardEvent {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 开始时间 */
  startTime: Date | string;
  /** 结束时间（可选） */
  endTime?: Date | string;
  /** 状态文本 */
  statusText?: string;
  /** 状态颜色 */
  statusColor?: string;
  /** 额外信息 */
  extraInfo?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 天数卡片视图属性接口
 */
export interface DaysCardViewProps {
  /** 事件列表 */
  events: DaysCardEvent[];
  /** 显示天数，默认为 4 */
  dayCount?: number;
  /** 起始日期（默认为今天） */
  startDate?: Date;
  /** 每天最大显示事件数，默认为 2 */
  maxEventsPerDay?: number;
  /** 是否显示周末，默认为 true */
  showWeekends?: boolean;
  /** 是否只读，默认为 false */
  readOnly?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 点击事件回调 */
  onEventClick?: (event: DaysCardEvent) => void;
  /** 自定义事件渲染 */
  eventRenderer?: (event: DaysCardEvent, day: Date) => React.ReactNode;
  /** 自定义日期卡片渲染 */
  dayCardRenderer?: (day: Date, events: DaysCardEvent[]) => React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 空状态内容 */
  emptyContent?: React.ReactNode;
  /** 额外操作按钮 */
  extraActions?: React.ReactNode;
}

/**
 * 天数卡片视图组件
 *
 * 用于展示未来 N 天的事件卡片视图，适合快速查看近期事件
 *
 * @example
 * ```tsx
 * <DaysCardView
 *   events={appointments}
 *   dayCount={4}
 *   maxEventsPerDay={2}
 *   onEventClick={(event) => console.log(event)}
 * />
 * ```
 */
export function DaysCardView({
  events,
  dayCount = 4,
  startDate: controlledStartDate,
  maxEventsPerDay = 2,
  showWeekends = true,
  loading = false,
  eventRenderer,
  dayCardRenderer,
  className,
  emptyContent,
  extraActions,
}: DaysCardViewProps) {
  // 内部起始日期状态
  const displayStartDate = React.useMemo(
    () => controlledStartDate ?? new Date(),
    [controlledStartDate]
  );

  // 生成天数列表
  const days = React.useMemo(() => {
    const start = new Date(displayStartDate);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: dayCount }, (_, i) => addDays(start, i));
  }, [displayStartDate, dayCount]);

  // 按日期分组事件
  const eventsByDay = React.useMemo(() => {
    const map: Record<string, DaysCardEvent[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.startTime);
      const key = format(eventDate, 'yyyy-MM-dd');
      map[key] = map[key] || [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  // 获取星期标签
  const getWeekdayLabel = (date: Date): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  // 获取日期标签（今天、明天等）
  const getDayLabel = (index: number): string => {
    const labels = ['今天', '明天', '后天', '大后天'];
    if (index < labels.length) {
      return labels[index];
    }
    return '';
  };

  // 解析日期
  const parseDate = (date: Date | string): Date => {
    return typeof date === 'string' ? new Date(date) : date;
  };

  // 默认事件渲染
  const defaultEventRenderer = (event: DaysCardEvent, _day: Date) => {
    const eventDate = parseDate(event.startTime);
    const time = format(eventDate, 'HH:mm');

    return (
      <div className="rounded-md border bg-card p-3">
        <div className="grid grid-cols-[60px_1fr] gap-3 items-center">
          <div className="flex flex-col items-start">
            <div className="text-2xl font-bold">{time}</div>
            {event.statusText && (
              <div className="text-xs text-muted-foreground">{event.statusText}</div>
            )}
          </div>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {event.subtitle && (
                <div className="flex items-center justify-center rounded-full border w-8 h-8 text-xs font-bold bg-muted">
                  {event.subtitle.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <div className="font-medium">{event.title}</div>
                {event.extraInfo && (
                  <div className="text-xs text-muted-foreground">{event.extraInfo}</div>
                )}
              </div>
            </div>
            {event.statusColor && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: event.statusColor }}
              >
                {event.statusText || '状态'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 默认日期卡片渲染
  const defaultDayCardRenderer = (day: Date, dayEvents: DaysCardEvent[]) => {
    const list = dayEvents.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const weekday = getWeekdayLabel(day);
    const dayLabel = getDayLabel(days.indexOf(day));

    return (
      <Card className="flex flex-col rounded-lg border bg-card text-card-foreground p-6 shadow-sm gap-3 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {format(day, 'MM月dd日')} {weekday}
            </span>
            {dayLabel && (
              <span className="text-muted-foreground">{dayLabel}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">共{list.length}条记录</div>
        </div>

        {list.length === 0 ? (
          <div className="text-xs text-muted-foreground">暂无事件</div>
        ) : (
          list.slice(0, maxEventsPerDay).map((event, index) => (
            <div key={event.id} className={index > 0 ? 'mt-1' : ''}>
              {eventRenderer ? eventRenderer(event, day) : defaultEventRenderer(event, day)}
            </div>
          ))
        )}

        {list.length > maxEventsPerDay && (
          <div className="text-xs text-muted-foreground">
            还有 {list.length - maxEventsPerDay} 条记录...
          </div>
        )}
      </Card>
    );
  };

  // 渲染加载骨架屏
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: dayCount }).map((_, index) => (
        <Card key={index} className="flex flex-col p-6 gap-3 h-full">
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/4" />
          {[0, 1].map((i) => (
            <div key={i} className="rounded-md border bg-muted p-3">
              <div className="h-8 bg-muted rounded w-1/4 mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {emptyContent || <p>暂无事件</p>}
    </div>
  );

  // 过滤周末
  const displayDays = showWeekends
    ? days
    : days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(displayStartDate, 'yyyy年MM月')}
        </div>
        {extraActions && <div className="flex items-center gap-2">{extraActions}</div>}
      </div>

      {/* 主体内容 */}
      {loading ? (
        renderSkeleton()
      ) : events.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[key] || [];

            return (
              <React.Fragment key={key}>
                {dayCardRenderer
                  ? dayCardRenderer(day, dayEvents)
                  : defaultDayCardRenderer(day, dayEvents)}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DaysCardView;
