import { TarArchive, ZipArchive } from 'archiver';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { CompressionFormat } from './enums';
import type { ArchivePackerContract } from './interfaces';

export class ArchivePacker implements ArchivePackerContract {
  async pack(
    distDir: string,
    archivePath: string,
    format: CompressionFormat,
  ): Promise<void> {
    const archive =
      format === CompressionFormat.Zip
        ? new ZipArchive({ zlib: { level: 9 } })
        : new TarArchive();
    const output = createWriteStream(path.resolve(archivePath));

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', (err) => {
        archive.destroy();
        reject(err);
      });
      archive.on('error', reject);

      if (format === CompressionFormat.TarGz) {
        const gzip = createGzip();
        gzip.on('error', reject);
        archive.pipe(gzip).pipe(output);
      } else {
        archive.pipe(output);
      }

      archive.directory(distDir, false);
      void archive.finalize();
    });
  }
}
