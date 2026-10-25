import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { WarningCircle, Eye, EyeSlash, SpinnerGap, User, Lock } from "@phosphor-icons/react";
import type { PasswordLoginFormProps, LoginCredentials } from "./types";

const passwordLoginSchema = z.object({
  username: z
    .string()
    .min(1, "请输入用户名")
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "用户名只能包含字母、数字、下划线和连字符"),
  password: z
    .string()
    .min(1, "请输入密码")
    .min(6, "密码至少6个字符")
    .max(20, "密码最多20个字符"),
  rememberMe: z.boolean().optional()
});

type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;

const PasswordLoginForm = React.forwardRef<HTMLFormElement, PasswordLoginFormProps>(
  ({ onSubmit, isLoading = false, error, placeholders = {}, onForgotPassword }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const {
      register,
      handleSubmit,
      formState: { errors },
      control,
      setValue
    } = useForm<PasswordLoginFormData>({
      resolver: zodResolver(passwordLoginSchema),
      defaultValues: {
        username: "",
        password: "",
        rememberMe: false
      }
    });

    const rememberMeValue = useWatch({ control, name: "rememberMe" });

    const onFormSubmit = (data: PasswordLoginFormData) => {
      const credentials: LoginCredentials = {
        type: "password",
        username: data.username,
        password: data.password,
        rememberMe: data.rememberMe || false
      };
      onSubmit(credentials);
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit(onFormSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <User
              className="absolute top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-normal left-2.5"
              style={{ 
                color: errors.username ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" 
              }}
            />
            <Input
              {...register("username")}
              type="text"
              placeholder={placeholders.username || "请输入用户名"}
              disabled={isLoading}
              className={cn(
                "w-full h-14 rounded-lg transition-all duration-normal",
                "border border-input hover:border-primary focus:border-primary",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                "placeholder:text-muted-foreground",
                "pl-8",
                errors.username && "!border-destructive focus:!ring-destructive/20"
              )}
              autoComplete="username"
              style={{ fontSize: "18px" }}
            />
          </div>
          {errors.username && (
            <div className="flex items-center text-xs text-destructive mt-1">
              <WarningCircle className="h-3 w-3 mr-1" />
              {errors.username.message}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Lock
              className="absolute top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-normal left-2.5"
              style={{ 
                color: errors.password ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" 
              }}
            />
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder={placeholders.password || "请输入密码"}
              disabled={isLoading}
              className={cn(
                "w-full h-14 rounded-lg transition-all duration-normal",
                "border border-input hover:border-primary focus:border-primary",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                "placeholder:text-muted-foreground",
                "pl-8 pr-11",
                errors.password && "!border-destructive focus:!ring-destructive/20"
              )}
              autoComplete="current-password"
              style={{ fontSize: "18px" }}
            />
            <Button
              type="button"
              variant="ghost"
             
              className="absolute top-1/2 -translate-y-1/2 px-2 hover:bg-transparent z-10 h-6 w-6 p-0 flex items-center justify-center"
              style={{ right: "16px" }}
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeSlash className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              ) : (
                <Eye className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              )}
            </Button>
          </div>
          {errors.password && (
            <div className="flex items-center text-xs text-destructive mt-1">
              <WarningCircle className="h-3 w-3 mr-1" />
              {errors.password.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between w-full">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMeValue}
              onChange={(e) => setValue("rememberMe", e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">记住我</span>
          </label>
          {onForgotPassword && (
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline ml-auto"
              onClick={onForgotPassword}
            >
              忘记密码？
            </button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="text-sm w-full">
            <WarningCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full h-14 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-normal font-normal text-base shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <SpinnerGap className="h-4 w-4 animate-spin" />
              登录中...
            </>
          ) : (
            "登 录"
          )}
        </Button>
      </form>
    );
  }
);
PasswordLoginForm.displayName = "PasswordLoginForm";

export { PasswordLoginForm };
