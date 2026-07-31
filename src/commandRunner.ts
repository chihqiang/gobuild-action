import { spawn } from 'node:child_process';
import type { CommandRunnerContract, ExecResult, RunOptions } from './interfaces';

export class CommandRunner implements CommandRunnerContract {
  run(command: string, args: readonly string[], options: RunOptions = {}): Promise<ExecResult> {
    return new Promise((resolve) => {
      const child = spawn(command, [...args], {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: options.stdio ?? 'pipe',
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
      }

      child.on('error', (err) => {
        resolve({ code: -1, stdout, stderr: stderr || err.message, signal: null });
      });
      child.on('close', (code, signal) => {
        resolve({ code: code ?? -1, stdout, stderr, signal });
      });
    });
  }
}
