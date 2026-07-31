import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as tar from 'tar';
import { CompressionFormat } from '../src/enums';
import { ArchivePacker } from '../src/packer';

const packer = new ArchivePacker();

describe('ArchivePacker.pack', () => {
  let tempDir: string;
  let distDir: string;
  let outDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gobuild-packer-'));
    distDir = path.join(tempDir, 'pkg');
    outDir = path.join(tempDir, 'out');
    await fs.mkdir(distDir);
    await fs.mkdir(outDir);
    await fs.writeFile(path.join(distDir, 'hello.txt'), 'hello world');
    await fs.writeFile(path.join(distDir, 'run.sh'), '#!/bin/sh\necho hi\n');
    await fs.chmod(path.join(distDir, 'run.sh'), 0o755);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates a zip archive containing all files', async () => {
    const archivePath = path.join(outDir, 'myapp.zip');
    await packer.pack(distDir, archivePath, CompressionFormat.Zip);
    await expect(fs.stat(archivePath)).resolves.toBeTruthy();

    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries().map((e) => e.entryName);
    expect(entries).toContain('hello.txt');
    expect(entries).toContain('run.sh');
    expect(zip.getEntry('hello.txt')!.getData().toString()).toBe('hello world');
  });

  it('creates a tar.gz archive containing all files', async () => {
    const archivePath = path.join(outDir, 'myapp.tar.gz');
    await packer.pack(distDir, archivePath, CompressionFormat.TarGz);
    await expect(fs.stat(archivePath)).resolves.toBeTruthy();

    const names: string[] = [];
    await tar.list({
      file: archivePath,
      gzip: true,
      onentry: (entry) => names.push(entry.path),
    });
    expect(names).toContain('hello.txt');
    expect(names).toContain('run.sh');
  });

  it('preserves executable permission in tar.gz', async () => {
    const archivePath = path.join(outDir, 'myapp.tar.gz');
    await packer.pack(distDir, archivePath, CompressionFormat.TarGz);

    const modes: Record<string, number> = {};
    await tar.list({
      file: archivePath,
      gzip: true,
      onentry: (entry) => {
        modes[entry.path] = entry.mode ?? 0o644;
      },
    });
    expect(modes['run.sh']! & 0o111).toBe(0o111);
  });
});
