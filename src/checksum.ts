import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChecksumGeneratorContract, ChecksumResult } from './interfaces';

export class ChecksumGenerator implements ChecksumGeneratorContract {
  async generate(
    distRootPath: string,
    binName: string,
    version: string,
  ): Promise<ChecksumResult> {
    const archives = await this.listArchives(distRootPath);
    if (archives.length === 0) {
      return {};
    }

    const baseName = `${this.sanitizeFilename(binName)}_${this.sanitizeFilename(version)}_checksums`;
    const sha256Path = path.join(distRootPath, `${baseName}.sha256`);
    const md5Path = path.join(distRootPath, `${baseName}.md5`);

    const sha256Lines: string[] = [];
    const md5Lines: string[] = [];
    for (const archive of archives) {
      const filePath = path.join(distRootPath, archive);
      const relative = path.posix.join(distRootPath, archive);
      const [sha256, md5] = await Promise.all([
        this.hashFile(filePath, 'sha256'),
        this.hashFile(filePath, 'md5'),
      ]);
      sha256Lines.push(`${sha256}  ${relative}`);
      md5Lines.push(`${md5}  ${relative}`);
    }

    await Promise.all([
      fs.writeFile(sha256Path, `${sha256Lines.join('\n')}\n`),
      fs.writeFile(md5Path, `${md5Lines.join('\n')}\n`),
    ]);

    return { sha256Path, md5Path };
  }

  sanitizeFilename(name: string): string {
    return name.replace(/[^A-Za-z0-9._-]/g, '-');
  }

  async hashFile(filePath: string, algorithm: string): Promise<string> {
    const hash = createHash(algorithm);
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    return hash.digest('hex');
  }

  private async listArchives(distRootPath: string): Promise<string[]> {
    const entries = await fs.readdir(distRootPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && /\.(zip|tar\.gz)$/.test(e.name))
      .map((e) => e.name)
      .filter((name) => !name.includes('checksums'))
      .sort();
  }
}
