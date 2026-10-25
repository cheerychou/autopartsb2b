export interface LoginCredentials {
  type: 'password' | 'sms';
  username?: string;
  password?: string;
  phone?: string;
  code?: string;
  rememberMe?: boolean;
}

export interface AuthError {
  type: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PasswordLoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
  isLoading?: boolean;
  error?: AuthError;
  placeholders?: {
    username?: string;
    password?: string;
  };
  onForgotPassword?: () => void;
}

export interface SMSLoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void> | void;
  onSendCode: (phone: string) => Promise<boolean>;
  isLoading?: boolean;
  error?: AuthError;
  placeholders?: {
    phone?: string;
    code?: string;
  };
  countdown?: number;
}
