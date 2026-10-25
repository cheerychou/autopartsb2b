import * as React from "react";
import { cn } from "cn";
import { PasswordLoginForm } from "./password-login-form";
import { SMSLoginForm } from "./sms-login-form";
import type { LoginCredentials, AuthError } from "./types";

export interface LoginPageProps {
  brandTitle?: string;
  brandLogo?: string;
  backgroundImage?: string;
  backgroundImageSmall?: string;
  backgroundImageMedium?: string;
  backgroundImageLarge?: string;
  showFooter?: boolean;
  onLoginSuccess?: (data: LoginCredentials) => void;
  onLoginError?: (error: AuthError) => void;
  onForgotPassword?: () => void;
  onSendSMSCode?: (phone: string) => Promise<boolean>;
  className?: string;
}

const LoginPage = React.forwardRef<HTMLDivElement, LoginPageProps>(
  ({
    brandTitle = "欢迎来到车地带",
    brandLogo = "/images/brand/logo.svg",
    backgroundImage = "/images/login/store-bg.png",
    backgroundImageSmall,
    backgroundImageMedium,
    backgroundImageLarge,
    showFooter = true,
    onLoginSuccess,
    onLoginError,
    onForgotPassword,
    onSendSMSCode,
    className
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState<"password" | "sms">("password");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<AuthError | null>(null);

    const handleSubmit = async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);

      try {
        if (onLoginSuccess) {
          await onLoginSuccess(credentials);
        }
      } catch (err) {
        const authError: AuthError = {
          type: "LOGIN_FAILED",
          message: err instanceof Error ? err.message : "登录失败，请稍后重试"
        };
        setError(authError);
        if (onLoginError) {
          onLoginError(authError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const handleSendCode = async (phone: string): Promise<boolean> => {
      if (onSendSMSCode) {
        return await onSendSMSCode(phone);
      }
      return false;
    };

    return (
    <div
      ref={ref}
      className={cn("h-screen flex overflow-hidden", className)}
    >
      <div
        className="relative"
        style={{ width: "65%", height: "100%" }}
      >
        {backgroundImage && (
          <picture>
            {backgroundImageLarge && (
              <source
                media="(min-width: 1920px)"
                srcSet={backgroundImageLarge}
              />
            )}
            {backgroundImageMedium && (
              <source
                media="(min-width: 1024px)"
                srcSet={backgroundImageMedium}
              />
            )}
            {backgroundImageSmall && (
              <source
                media="(min-width: 768px)"
                srcSet={backgroundImageSmall}
              />
            )}
            <img
              src={backgroundImage}
              alt="Background"
              loading="eager"
              decoding="async"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0
              }}
              onError={(e) => console.error('Background image failed to load:', backgroundImage, e)}
            />
          </picture>
        )}
      </div>

        <div
          className="flex flex-col items-center bg-background relative overflow-y-auto"
          style={{ width: "35%", height: "100%", paddingTop: "15vh" }}
        >
          <div className="w-full flex flex-col items-center" style={{ maxWidth: "420px", padding: "0 32px" }}>
            {/* A区：品牌标识 */}
            <div className="w-full flex flex-col items-center">
              {brandLogo && (
                <img
                  src={brandLogo}
                  alt="Brand Logo"
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto"
                  style={{ maxWidth: "100%" }}
                />
              )}
              {brandTitle && (
                <div className="text-xl font-semibold text-foreground mt-4 text-center">
                  {brandTitle}
                </div>
              )}
            </div>

            {/* B区：登录表单 */}
            <div className="w-full mt-20">
              <div className="w-full flex items-center justify-between mb-4">
                <div
                  onClick={() => setActiveTab("password")}
                  className={cn(
                    "text-sm cursor-pointer select-none transition-colors hover:text-muted-foreground",
                    activeTab === "password" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  用户名密码登录
                </div>
                <div
                  onClick={() => setActiveTab("sms")}
                  className={cn(
                    "text-sm cursor-pointer select-none transition-colors hover:text-muted-foreground",
                    activeTab === "sms" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  短信验证码登录
                </div>
              </div>

              <div className="w-full">
                {activeTab === "password" ? (
                  <PasswordLoginForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={error || undefined}
                    onForgotPassword={onForgotPassword}
                  />
                ) : (
                  <SMSLoginForm
                    onSubmit={handleSubmit}
                    onSendCode={handleSendCode}
                    isLoading={isLoading}
                    error={error || undefined}
                  />
                )}
              </div>

              {showFooter && (
                <div className="mt-8 text-center text-sm">
                  <div className="text-muted-foreground">
                    <p>登录即表示您同意我们的</p>
                    <div className="flex flex-row gap-4 mt-2 justify-center">
                      <a href="#" className="text-primary hover:text-primary hover:underline">
                        服务条款
                      </a>
                      <span>|</span>
                      <a href="#" className="text-primary hover:text-primary hover:underline">
                        隐私政策
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 py-4 text-center text-xs text-muted-foreground">
            Copyright © 2024-2026 Hangzhou ShenBing Technology Company
          </div>
        </div>
      </div>
    );
  }
);
LoginPage.displayName = "LoginPage";

export { LoginPage };
