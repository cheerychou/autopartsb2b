import * as React from "react"
import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "./button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

export interface ThemeToggleProps {
  className?: string
}

/**
 * 主题切换组件
 * 支持深色/浅色模式切换，带有Tooltip提示
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    // 从 localStorage 读取保存的主题，回退到系统偏好
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    if (savedTheme) return savedTheme
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  // 主题变化时同步 DOM class（外部系统）
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={className}
            />
          }
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 transition-all" />
          ) : (
            <Sun className="h-4 w-4 transition-all" />
          )}
          <span className="sr-only">切换主题</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{theme === "light" ? "切换到深色模式" : "切换到浅色模式"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ThemeToggle