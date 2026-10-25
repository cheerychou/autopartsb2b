import * as React from 'react';
import { Star, StarHalf } from "@phosphor-icons/react";
import { cn } from "cn";

export interface RateProps {
  value?: number;
  count?: number;
  allowHalf?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  allowClear?: boolean;
  character?: React.ReactNode;
  characterRender?: (props: { index: number; value: number }) => React.ReactNode;
  onChange?: (value: number) => void;
  onHoverChange?: (value: number) => void;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  color?: string;
  emptyColor?: string;
}

const Rate = React.forwardRef<HTMLDivElement, RateProps>(
  ({
    value = 0,
    count = 5,
    allowHalf = false,
    disabled = false,
    readonly = false,
    allowClear = true,
    character,
    characterRender,
    onChange,
    onHoverChange,
    className,
    style,
    size = 20,
    color = '#fbbf24',
    emptyColor = '#d1d5db',
    ...props
  }, ref) => {
    const [hoverValue, setHoverValue] = React.useState<number>(0);
    const [internalValue, setInternalValue] = React.useState<number>(value);

    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const displayValue = hoverValue || internalValue;

    const handleMouseEnter = (index: number, isHalf: boolean) => {
      if (disabled || readonly) return;
      const newValue = isHalf && allowHalf ? index + 0.5 : index + 1;
      setHoverValue(newValue);
      onHoverChange?.(newValue);
    };

    const handleMouseLeave = () => {
      if (disabled || readonly) return;
      setHoverValue(0);
      onHoverChange?.(0);
    };

    const handleClick = (index: number, isHalf: boolean) => {
      if (disabled || readonly) return;
      const newValue = isHalf && allowHalf ? index + 0.5 : index + 1;
      
      if (allowClear && newValue === internalValue) {
        setInternalValue(0);
        onChange?.(0);
      } else {
        setInternalValue(newValue);
        onChange?.(newValue);
      }
    };

    const renderStar = (index: number) => {
      const starValue = index + 1;
      const isFull = displayValue >= starValue;
      const isHalf = allowHalf && displayValue >= index + 0.5 && displayValue < starValue;
      const isEmpty = !isFull && !isHalf;

      const defaultCharacter = isHalf ? (
        <StarHalf className="w-full h-full" />
      ) : (
        <Star className="w-full h-full" />
      );

      const renderedCharacter = characterRender
        ? characterRender({ index, value: displayValue })
        : character || defaultCharacter;

      return (
        <div
          key={index}
          className="relative cursor-pointer transition-transform hover:scale-110"
          style={{ width: size, height: size }}
          onMouseEnter={() => handleMouseEnter(index, false)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(index, false)}
        >
          {allowHalf && !readonly && (
            <div
              className="absolute inset-0 z-10"
              style={{ width: '50%' }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                handleMouseEnter(index, true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(index, true);
              }}
            />
          )}
          <div
            className={cn(
              'transition-colors',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{
              color: isEmpty ? emptyColor : color,
              fontSize: size
            }}
          >
            {renderedCharacter}
          </div>
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center gap-1', className)}
        style={style}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {Array.from({ length: count }).map((_, index) => renderStar(index))}
      </div>
    );
  }
);

Rate.displayName = 'Rate';

export { Rate };
