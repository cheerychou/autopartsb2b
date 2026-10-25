import * as React from "react"
import { CaretLeft, CaretRight, Circle } from "@phosphor-icons/react";
import { cn } from "cn"
import { Button } from "./button"

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  autoplay?: boolean
  autoplayInterval?: number
  showArrows?: boolean
  showDots?: boolean
  infinite?: boolean
  className?: string
}

export interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const CarouselContext = React.createContext<{
  currentIndex: number
  goToSlide: (index: number) => void
  nextSlide: () => void
  prevSlide: () => void
  itemCount: number
}>({
  currentIndex: 0,
  goToSlide: () => {},
  nextSlide: () => {},
  prevSlide: () => {},
  itemCount: 0,
})

/**
 * 轮播图组件
 * 支持自动播放、手动切换、无限循环
 */
const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ 
    children, 
    autoplay = false, 
    autoplayInterval = 3000,
    showArrows = true,
    showDots = true,
    infinite = true,
    className,
    ...props 
  }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const items = React.Children.toArray(children)
    const itemCount = items.length

    const goToSlide = React.useCallback((index: number) => {
      if (infinite) {
        if (index < 0) {
          setCurrentIndex(itemCount - 1)
        } else if (index >= itemCount) {
          setCurrentIndex(0)
        } else {
          setCurrentIndex(index)
        }
      } else {
        setCurrentIndex(Math.max(0, Math.min(index, itemCount - 1)))
      }
    }, [itemCount, infinite])

    const nextSlide = React.useCallback(() => {
      goToSlide(currentIndex + 1)
    }, [currentIndex, goToSlide])

    const prevSlide = React.useCallback(() => {
      goToSlide(currentIndex - 1)
    }, [currentIndex, goToSlide])

    React.useEffect(() => {
      if (autoplay) {
        const interval = setInterval(() => {
          nextSlide()
        }, autoplayInterval)
        return () => clearInterval(interval)
      }
    }, [autoplay, autoplayInterval, nextSlide])

    const contextValue = React.useMemo(
      () => ({
        currentIndex,
        goToSlide,
        nextSlide,
        prevSlide,
        itemCount,
      }),
      [currentIndex, goToSlide, nextSlide, prevSlide, itemCount]
    )

    return (
      <CarouselContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("relative overflow-hidden", className)}
          {...props}
        >
          <div className="relative flex transition-transform duration-slow ease-in-out">
            {items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "w-full flex-shrink-0",
                  index !== currentIndex && "hidden"
                )}
              >
                {item}
              </div>
            ))}
          </div>

          {showArrows && itemCount > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={prevSlide}
                aria-label="上一张"
              >
                <CaretLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={nextSlide}
                aria-label="下一张"
              >
                <CaretRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {showDots && itemCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    index === currentIndex
                      ? "w-6 bg-primary"
                      : "bg-muted-foreground/50 hover:bg-muted-foreground"
                  )}
                >
                  <Circle className="h-2 w-2" />
                </button>
              ))}
            </div>
          )}
        </div>
      </CarouselContext.Provider>
    )
  }
)

Carousel.displayName = "Carousel"

/**
 * 轮播图项组件
 */
const CarouselItem = React.forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      />
    )
  }
)

CarouselItem.displayName = "CarouselItem"

export { Carousel, CarouselItem }
