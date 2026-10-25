import * as React from "react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SpinnerGap, DeviceMobile, ChatCircle, WarningCircle } from "@phosphor-icons/react";
import type { SMSLoginFormProps } from "./types";

const SMSLoginForm = React.forwardRef<HTMLFormElement, SMSLoginFormProps>(
  ({ onSubmit, onSendCode, isLoading = false, error, placeholders = {}, countdown = 60 }, ref) => {
    const [credentials, setCredentials] = React.useState<{ phone: string; code: string }>({
      phone: "",
      code: ""
    });
    
    const [errors, setErrors] = React.useState<Partial<Record<"phone" | "code", string>>>({});
    const [codeSent, setCodeSent] = React.useState(false);
    const [currentCountdown, setCurrentCountdown] = React.useState(0);
    const [sendingCode, setSendingCode] = React.useState(false);

    const validatePhone = (phone: string): string | null => {
      if (!phone.trim()) {
        return "请输入手机号";
      }
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return "请输入正确的手机号";
      }
      return null;
    };

    const validateCode = (code: string): string | null => {
      if (!code.trim()) {
        return "请输入验证码";
      }
      if (!/^\d{6}$/.test(code)) {
        return "验证码格式不正确";
      }
      return null;
    };

    const handleFieldChange = (field: "phone" | "code", value: string) => {
      setCredentials(prev => ({ ...prev, [field]: value }));
      
      let errorMsg: string | null = null;
      if (field === "phone") {
        errorMsg = validatePhone(value);
      } else if (field === "code") {
        errorMsg = validateCode(value);
      }
      
      setErrors(prev => ({
        ...prev,
        [field]: errorMsg || undefined
      }));
    };

    const handleSendCode = async () => {
      const phoneError = validatePhone(credentials.phone);
      if (phoneError) {
        setErrors(prev => ({ ...prev, phone: phoneError }));
        return;
      }

      setSendingCode(true);
      try {
        const success = await onSendCode(credentials.phone);
        if (success) {
          setCodeSent(true);
          setCurrentCountdown(countdown);
          
          const timer = setInterval(() => {
            setCurrentCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error("发送验证码失败:", error);
      } finally {
        setSendingCode(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const phoneError = validatePhone(credentials.phone);
      const codeError = validateCode(credentials.code);

      if (phoneError || codeError) {
        setErrors({
          phone: phoneError || undefined,
          code: codeError || undefined
        });
        return;
      }

      await onSubmit({
        type: "sms",
        ...credentials
      });
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <DeviceMobile
              className="absolute top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-normal"
              style={{ 
                left: "12px",
                color: errors.phone ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" 
              }}
            />
            <Input
              value={credentials.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              type="tel"
              placeholder={placeholders.phone || "请输入手机号"}
              disabled={isLoading || sendingCode}
              className={cn(
                "w-full h-14 rounded-lg transition-all duration-normal",
                "border border-input hover:border-primary focus:border-primary",
                "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                "placeholder:text-muted-foreground",
                "pl-9",
                errors.phone && "!border-destructive focus:!ring-destructive/20"
              )}
              autoComplete="tel"
              style={{ fontSize: "18px" }}
            />
          </div>
          {errors.phone && (
            <div className="flex items-center text-xs text-destructive mt-1">
              <WarningCircle className="h-3 w-3 mr-1" />
              {errors.phone}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full flex gap-3">
            <div className="relative flex-1">
              <ChatCircle
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-normal"
                style={{ 
                  left: "12px",
                  color: errors.code ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" 
                }}
              />
              <Input
                value={credentials.code}
                onChange={(e) => handleFieldChange("code", e.target.value)}
                type="text"
                placeholder={placeholders.code || "请输入验证码"}
                disabled={isLoading}
                className={cn(
                  "w-full h-14 rounded-lg transition-all duration-normal",
                  "border border-input hover:border-primary focus:border-primary",
                  "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                  "placeholder:text-muted-foreground",
                  "pl-9",
                  errors.code && "!border-destructive focus:!ring-destructive/20"
                )}
                autoComplete="one-time-code"
                style={{ fontSize: "18px" }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-14 px-4 min-w-[100px] rounded-lg transition-all duration-normal text-sm",
                codeSent
                  ? "bg-muted text-muted-foreground border-input"
                  : "text-primary border-primary hover:bg-primary/5"
              )}
              onClick={handleSendCode}
              disabled={isLoading || sendingCode || currentCountdown > 0}
            >
              {sendingCode ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : currentCountdown > 0 ? (
                `${currentCountdown}s后重发`
              ) : (
                codeSent ? "重新获取" : "获取验证码"
              )}
            </Button>
          </div>
          {errors.code && (
            <div className="flex items-center text-xs text-destructive mt-1">
              <WarningCircle className="h-3 w-3 mr-1" />
              {errors.code}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive w-full p-3 rounded-md bg-destructive/10">
            <WarningCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error.message}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-14 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-normal font-normal text-base shadow-sm mt-6"
          disabled={isLoading || !codeSent}
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
SMSLoginForm.displayName = "SMSLoginForm";

export { SMSLoginForm };
