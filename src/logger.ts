import type { LoggerContract } from './interfaces';

function color(code: string, message: string): string {
  return `\x1b[${code}m${message}\x1b[0m`;
}

export class Logger implements LoggerContract {
  step(message: string): void {
    console.log(color('1;36', `🚀 ${message}`));
  }
  success(message: string): void {
    console.log(color('1;32', `✅ ${message}`));
  }
  error(message: string): void {
    console.error(color('1;31', `❌ ${message}`));
  }
  info(message: string): void {
    console.log(message);
  }
}
