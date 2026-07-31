import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileCopierContract } from './interfaces';

export class ExtraFileCopier implements FileCopierContract {
  async copy(
    files: readonly string[],
    destDir: string,
    cwd = process.cwd(),
  ): Promise<void> {
    for (const file of files) {
      try {
        await fs.cp(path.resolve(cwd, file), path.join(destDir, path.basename(file)), {
          recursive: true,
          force: true,
        });
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
          throw err;
        }
      }
    }
  }
}
