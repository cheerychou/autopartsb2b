import * as React from "react"
import { UploadSimple as UploadIcon, X, File, Image as ImageIcon, FileText, Download, Eye } from "@phosphor-icons/react";
import { cn } from "cn"

export interface FileItem {
  id: string
  file: File
  url?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
}

export interface UploadProps {
  value?: FileItem[]
  onChange?: (files: FileItem[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxCount?: number
  disabled?: boolean
  className?: string
  onUpload?: (file: File, onProgress: (progress: number) => void) => Promise<string>
  onPreview?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onRemove?: (file: FileItem) => void
  showPreview?: boolean
  showDownload?: boolean
  dragText?: string
  dragSubText?: string
}

/**
 * 文件上传组件
 * 支持拖拽上传、文件预览、上传进度
 */
const Upload = React.forwardRef<HTMLDivElement, UploadProps>(
  ({ 
    value = [],
    onChange,
    accept,
    multiple = false,
    maxSize = 10 * 1024 * 1024,
    maxCount,
    disabled = false,
    className,
    onUpload,
    onPreview,
    onDownload,
    onRemove,
    showPreview = true,
    showDownload = true,
    dragText = "点击或拖拽文件到此处上传",
    dragSubText = `支持单个文件最大 ${maxSize / 1024 / 1024}MB`,
    ...props 
  }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      
      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      handleFiles(files)
    }

    const handleClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.click()
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      handleFiles(files)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }

    const handleFiles = async (files: File[]) => {
      const filteredFiles = files.filter(file => {
        if (accept && !isFileAccepted(file, accept)) {
          console.warn(`文件类型不支持: ${file.name}`)
          return false
        }
        if (file.size > maxSize) {
          console.warn(`文件大小超过限制: ${file.name}`)
          return false
        }
        if (maxCount && value.length + files.length > maxCount) {
          console.warn(`文件数量超过限制: 最多 ${maxCount} 个`)
          return false
        }
        return true
      })

      if (filteredFiles.length === 0) return

      const newFiles: FileItem[] = filteredFiles.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending'
      }))

      const updatedFiles = [...value, ...newFiles]
      onChange?.(updatedFiles)

      for (const fileItem of newFiles) {
        await uploadFile(fileItem, updatedFiles)
      }
    }

    const uploadFile = async (fileItem: FileItem, currentFiles: FileItem[]) => {
      try {
        if (onUpload) {
          const url = await onUpload(fileItem.file, (progress) => {
            const updatedFiles = currentFiles.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'uploading' as const, progress }
                : f
            )
            onChange?.(updatedFiles)
          })

          const updatedFiles = currentFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success' as const, url }
              : f
          )
          onChange?.(updatedFiles)
        } else {
          const url = URL.createObjectURL(fileItem.file)
          const updatedFiles = currentFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success' as const, url }
              : f
          )
          onChange?.(updatedFiles)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '上传失败'
        const updatedFiles = currentFiles.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
        onChange?.(updatedFiles)
      }
    }

    const isFileAccepted = (file: File, accept: string): boolean => {
      const acceptList = accept.split(',').map(item => item.trim())
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const fileType = file.type

      return acceptList.some(item => {
        if (item.startsWith('.')) {
          return fileExtension === item.toLowerCase()
        }
        return fileType.startsWith(item)
      })
    }

    const handleRemove = (fileItem: FileItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return

      const updatedFiles = value.filter(f => f.id !== fileItem.id)
      onChange?.(updatedFiles)
      onRemove?.(fileItem)
    }

    const handlePreview = (fileItem: FileItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      onPreview?.(fileItem)
    }

    const handleDownload = (fileItem: FileItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      onDownload?.(fileItem)
    }

    const getFileIcon = (file: File) => {
      const type = file.type
      if (type.startsWith('image/')) {
        return <ImageIcon className="h-5 w-5" />
      }
      if (type.startsWith('text/') || type.includes('pdf') || type.includes('document')) {
        return <FileText className="h-5 w-5" />
      }
      return <File className="h-5 w-5" />
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const isMaxCountReached = maxCount && value.length >= maxCount

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        <div
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-input hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50",
            !disabled && "cursor-pointer"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple && !isMaxCountReached ? true : undefined}
            disabled={disabled || isMaxCountReached ? true : undefined}
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2 text-center">
            <UploadIcon className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{dragText}</p>
              <p className="text-xs text-muted-foreground">{dragSubText}</p>
              {maxCount && (
                <p className="text-xs text-muted-foreground">
                  最多上传 {maxCount} 个文件
                </p>
              )}
            </div>
          </div>
        </div>

        {value.length > 0 && (
          <div className="space-y-2">
            {value.map((fileItem) => (
              <div
                key={fileItem.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
                  fileItem.status === 'error' && "border-destructive bg-destructive-soft"
                )}
              >
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(fileItem.file)}
                </div>
                
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{fileItem.file.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </span>
                  </div>
                  
                  {fileItem.status === 'uploading' && fileItem.progress !== undefined && fileItem.progress > 0 && (
                    <div className="w-full">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-slow"
                          style={{ width: `${fileItem.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        上传中 {fileItem.progress}%
                      </p>
                    </div>
                  )}
                  
                  {fileItem.status === 'error' && (
                    <p className="text-xs text-destructive">
                      {fileItem.error || '上传失败'}
                    </p>
                  )}
                  
                  {fileItem.status === 'success' && (
                    <p className="text-xs text-success">上传成功</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {showPreview && fileItem.status === 'success' && fileItem.url && (
                    <button
                      type="button"
                      onClick={(e) => handlePreview(fileItem, e)}
                      disabled={disabled}
                      className={cn(
                        "rounded p-1.5 text-muted-foreground hover:bg-muted",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  
                  {showDownload && fileItem.status === 'success' && fileItem.url && (
                    <button
                      type="button"
                      onClick={(e) => handleDownload(fileItem, e)}
                      disabled={disabled}
                      className={cn(
                        "rounded p-1.5 text-muted-foreground hover:bg-muted",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={(e) => handleRemove(fileItem, e)}
                    disabled={disabled}
                    className={cn(
                      "rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

Upload.displayName = "Upload"

export { Upload }
