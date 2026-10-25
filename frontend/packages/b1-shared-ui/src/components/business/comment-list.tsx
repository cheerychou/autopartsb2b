import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { cn } from "cn"

export interface Comment {
  id: string
  author: string
  authorAvatar?: string
  content: string
  time?: string
  likes?: number
  replies?: Comment[]
  actions?: Array<{
    label: string
    onClick: () => void
  }>
}

export interface CommentListProps {
  comments: Comment[]
  onReply?: (commentId: string) => void
  onLike?: (commentId: string) => void
  onDelete?: (commentId: string) => void
  maxReplies?: number
  className?: string
}

/**
 * 评论列表
 * 展示评论及其回复
 */
const CommentList = React.forwardRef<HTMLDivElement, CommentListProps>(
  ({ 
    comments,
    onReply,
    onLike,
    onDelete,
    maxReplies = 3,
    className,
    ...props 
  }, ref) => {
    const formatTime = (time?: string) => {
      if (!time) return ''
      return time
    }

    const renderComment = (comment: Comment, level: number = 0) => {
      const hasReplies = comment.replies && comment.replies.length > 0
      const visibleReplies = hasReplies ? comment.replies!.slice(0, maxReplies) : []
      const hasMoreReplies = hasReplies && comment.replies!.length > maxReplies

      return (
        <div
          key={comment.id}
          className={cn(
            "flex gap-3 pb-6",
            level > 0 && "ml-12"
          )}
        >
          <Avatar className="flex-shrink-0">
            {comment.authorAvatar && (
              <AvatarImage src={comment.authorAvatar} alt={comment.author} />
            )}
            <AvatarFallback>
              {comment.author.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {comment.author}
              </span>
              {comment.time && (
                <span className="text-xs text-muted-foreground">
                  {formatTime(comment.time)}
                </span>
              )}
            </div>

            <p className="text-sm text-foreground">
              {comment.content}
            </p>

            <div className="flex items-center gap-4">
              {comment.likes !== undefined && (
                <Button
                  variant="ghost"
                 
                  onClick={() => onLike?.(comment.id)}
                  className="h-7 px-2 text-xs"
                >
                  ❤️ {comment.likes}
                </Button>
              )}

              {onReply && (
                <Button
                  variant="ghost"
                 
                  onClick={() => onReply(comment.id)}
                  className="h-7 px-2 text-xs"
                >
                  回复
                </Button>
              )}

              {comment.actions?.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                 
                  onClick={action.onClick}
                  className="h-7 px-2 text-xs"
                >
                  {action.label}
                </Button>
              ))}

              {onDelete && (
                <Button
                  variant="ghost"
                 
                  onClick={() => onDelete(comment.id)}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                >
                  删除
                </Button>
              )}
            </div>

            {hasReplies && (
              <div className="mt-4 space-y-4">
                {visibleReplies.map(reply => renderComment(reply, level + 1))}
                {hasMoreReplies && (
                  <Button
                    variant="ghost"
                   
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    查看更多 {comment.replies!.length - maxReplies} 条回复
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("space-y-6", className)}
        {...props}
      >
        {comments.map(comment => renderComment(comment))}
      </div>
    )
  }
)

CommentList.displayName = "CommentList"

export { CommentList }
