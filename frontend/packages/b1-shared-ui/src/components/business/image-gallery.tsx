import * as React from "react"
import { X, Download, ArrowsOut, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "cn"

export interface GalleryImage {
  id: string
  url: string
  thumbnail?: string
  title?: string
  description?: string
}

export interface ImageGalleryProps {
  images: GalleryImage[]
  initialIndex?: number
  onIndexChange?: (index: number) => void
  onDownload?: (image: GalleryImage) => void
  showDownload?: boolean
  showNavigation?: boolean
  showThumbnails?: boolean
  className?: string
  imageClassName?: string
}

/**
 * 图片画廊
 * 支持图片预览、缩放、下载等功能
 */
const ImageGallery = React.forwardRef<HTMLDivElement, ImageGalleryProps>(
  ({ 
    images,
    initialIndex = 0,
    onIndexChange,
    onDownload,
    showDownload = true,
    showNavigation = true,
    showThumbnails = true,
    className,
    imageClassName,
    ...props 
  }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex)
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    const currentImage = images[currentIndex]

    React.useEffect(() => {
      setCurrentIndex(initialIndex)
    }, [initialIndex])

    const handlePrev = () => {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1
      setCurrentIndex(newIndex)
      onIndexChange?.(newIndex)
    }

    const handleNext = () => {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0
      setCurrentIndex(newIndex)
      onIndexChange?.(newIndex)
    }

    const handleImageClick = (index: number) => {
      setCurrentIndex(index)
      onIndexChange?.(index)
    }

    const handleDownload = () => {
      onDownload?.(currentImage)
    }

    const handleFullscreen = () => {
      setIsFullscreen(!isFullscreen)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div className={cn(
          "relative overflow-hidden rounded-lg bg-muted",
          isFullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full"
        )}>
          {currentImage && (
            <img
              src={currentImage.url}
              alt={currentImage.title || `Image ${currentIndex + 1}`}
              className={cn(
                "w-full h-full object-contain",
                imageClassName
              )}
            />
          )}

          {showNavigation && images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2",
                  "flex h-10 w-10 items-center justify-center",
                  "rounded-full bg-black/50 text-white",
                  "hover:bg-black/70 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                aria-label="上一张"
              >
                <CaretLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2",
                  "flex h-10 w-10 items-center justify-center",
                  "rounded-full bg-black/50 text-white",
                  "hover:bg-black/70 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                aria-label="下一张"
              >
                <CaretRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute top-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={handleFullscreen}
              className={cn(
                "flex h-10 w-10 items-center justify-center",
                "rounded-full bg-black/50 text-white",
                "hover:bg-black/70 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              aria-label={isFullscreen ? "退出全屏" : "全屏"}
            >
              {isFullscreen ? (
                <X className="h-5 w-5" />
              ) : (
                <ArrowsOut className="h-5 w-5" />
              )}
            </button>

            {showDownload && onDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className={cn(
                  "flex h-10 w-10 items-center justify-center",
                  "rounded-full bg-black/50 text-white",
                  "hover:bg-black/70 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                aria-label="下载"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
          </div>

          {currentImage && (currentImage.title || currentImage.description) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              {currentImage.title && (
                <h3 className="text-lg font-semibold text-white">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.description && (
                <p className="text-sm text-white/90">
                  {currentImage.description}
                </p>
              )}
            </div>
          )}
        </div>

        {showThumbnails && images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleImageClick(index)}
                className={cn(
                  "flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  index === currentIndex
                    ? "border-primary scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
                style={{
                  width: '80px',
                  height: '80px'
                }}
              >
                <img
                  src={image.thumbnail || image.url}
                  alt={image.title || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

ImageGallery.displayName = "ImageGallery"

export { ImageGallery }
