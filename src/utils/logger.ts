export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

export function createLogger(scope: string): Logger {
  return {
    info(message: string): void {
      console.log(`[${scope}] ${message}`);
    },
    error(message: string): void {
      console.error(`[${scope}] ${message}`);
    }
  };
}
