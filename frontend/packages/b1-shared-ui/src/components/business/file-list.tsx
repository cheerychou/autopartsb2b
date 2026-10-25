import * as React from "react"
import { File as FileIcon, Download, Trash, Eye, Copy, Folder } from "@phosphor-icons/react";
import { Button } from "../ui/button"
import { cn } from "cn"

export interface FileItem {
  id: string
  name: string
  size?: string
  type?: string
  url?: string
  isFolder?: boolean
  modifiedTime?: string
  thumbnail?: string
}

export interface FileListProps {
  files: FileItem[]
  onDownload?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onPreview?: (file: FileItem) => void
  onCopy?: (file: FileItem) => void
  onSelect?: (file: FileItem) => void
  selectedFiles?: string[]
  className?: string
  showSize?: boolean
  showModifiedTime?: boolean
}

/**
 * 文件列表
 * 展示文件和文件夹列表
 */
const FileList = React.forwardRef<HTMLDivElement, FileListProps>(
  ({ 
    files,
    onDownload,
    onDelete,
    onPreview,
    onCopy,
    onSelect,
    selectedFiles = [],
    className,
    showSize = true,
    showModifiedTime = true,
    ...props 
  }, ref) => {
    const getFileIcon = (file: FileItem) => {
      if (file.isFolder) {
        return <Folder className="h-5 w-5 text-primary" />
      }
      
      const iconMap: Record<string, React.ReactNode> = {
        'image': <FileIcon className="h-5 w-5 text-stat-1" />,
        'pdf': <FileIcon className="h-5 w-5 text-destructive" />,
        'word': <FileIcon className="h-5 w-5 text-primary" />,
        'excel': <FileIcon className="h-5 w-5 text-success" />,
        'zip': <FileIcon className="h-5 w-5 text-warning" />,
        'video': <FileIcon className="h-5 w-5 text-stat-7" />,
        'audio': <FileIcon className="h-5 w-5 text-warning" />
      }
      
      const type = file.type?.toLowerCase() || ''
      for (const [key, icon] of Object.entries(iconMap)) {
        if (type.includes(key)) {
          return icon
        }
      }
      
      return <FileIcon className="h-5 w-5 text-muted-foreground" />
    }

    const isSelected = (fileId: string) => selectedFiles.includes(fileId)

    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => onSelect?.(file)}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors",
              "hover:border-primary hover:bg-accent",
              isSelected(file.id) && "border-primary bg-accent",
              "cursor-pointer"
            )}
          >
            {file.thumbnail ? (
              <img
                src={file.thumbnail}
                alt={file.name}
                className="h-12 w-12 flex-shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted">
                {getFileIcon(file)}
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-foreground">
                  {file.name}
                </p>
                {file.isFolder && (
                  <span className="text-xs text-muted-foreground">
                    文件夹
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {showSize && file.size && (
                  <span>{file.size}</span>
                )}
                {showModifiedTime && file.modifiedTime && (
                  <span>{file.modifiedTime}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onPreview && !file.isFolder && file.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPreview(file)
                  }}
                  className="h-8 w-8"
                  title="预览"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              {onDownload && !file.isFolder && file.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload(file)
                  }}
                  className="h-8 w-8"
                  title="下载"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {onCopy && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopy(file)
                  }}
                  className="h-8 w-8"
                  title="复制链接"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(file)
                  }}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="删除"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }
)

FileList.displayName = "FileList"

export { FileList }
