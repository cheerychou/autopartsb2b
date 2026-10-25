class Logger {
  // 类型断言而非 import.meta.env.DEV：shared-ui 的 vite-env.d.ts 刻意只声明 BASE_URL
  // （扩声明会与 web 端 vite/client 的 ImportMetaEnv 合并冲突），故此处局部断言。
  private isDevelopment =
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

  private formatMessage(...args: unknown[]): string {
    return args
      .map((arg) => {
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}\n${arg.stack}`;
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  debug(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${this.formatMessage(...args)}`);
    }
  }

  info(...args: unknown[]): void {
    console.info(`[INFO] ${this.formatMessage(...args)}`);
  }

  warn(...args: unknown[]): void {
    console.warn(`[WARN] ${this.formatMessage(...args)}`);
  }

  error(...args: unknown[]): void {
    console.error(`[ERROR] ${this.formatMessage(...args)}`);
  }
}

export default new Logger();
