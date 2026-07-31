import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ChecksumGenerator } from '../src/checksum';

const generator = new ChecksumGenerator();

describe('ChecksumGenerator.sanitizeFilename', () => {
  it('replaces unsafe characters', () => {
    expect(generator.sanitizeFilename('v1.0/rc-1')).toBe('v1.0-rc-1');
    expect(generator.sanitizeFilename('myapp')).toBe('myapp');
  });
});

describe('ChecksumGenerator.generate', () => {
  let tempDir: string;
  let distDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gobuild-check-'));
    distDir = path.join(tempDir, 'dist');
    await fs.mkdir(distDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('skips when no archives exist', async () => {
    const result = await generator.generate(distDir, 'myapp', '1.0');
    expect(result).toEqual({});
  });

  it('generates sha256 and md5 checksum files', async () => {
    await fs.writeFile(path.join(distDir, 'myapp_linux_amd64.tar.gz'), 'binary-data-1');
    await fs.writeFile(path.join(distDir, 'myapp_windows_amd64.zip'), 'binary-data-2');
    await fs.writeFile(path.join(distDir, 'myapp_1.0_checksums.sha256'), 'old');

    const result = await generator.generate(distDir, 'myapp', '1.0');
    expect(result.sha256Path).toBe(path.join(distDir, 'myapp_1.0_checksums.sha256'));
    expect(result.md5Path).toBe(path.join(distDir, 'myapp_1.0_checksums.md5'));

    const sha256 = await fs.readFile(result.sha256Path!, 'utf8');
    const md5 = await fs.readFile(result.md5Path!, 'utf8');
    const expectedSha = await generator.hashFile(path.join(distDir, 'myapp_linux_amd64.tar.gz'), 'sha256');

    expect(sha256).toContain(`${expectedSha}  `);
    expect(sha256).toContain('myapp_linux_amd64.tar.gz');
    expect(sha256).toContain('myapp_windows_amd64.zip');
    expect(md5).toContain('myapp_windows_amd64.zip');
    expect(sha256).not.toContain('checksums');
  });

  it('excludes old checksum files from itself', async () => {
    await fs.writeFile(path.join(distDir, 'myapp_linux_amd64.tar.gz'), 'data');
    const result = await generator.generate(distDir, 'myapp', '1.0');
    const sha256 = await fs.readFile(result.sha256Path!, 'utf8');
    expect(sha256.split('\n')).toHaveLength(2);
  });
});

describe('ChecksumGenerator.hashFile', () => {
  it('computes md5 hash', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gobuild-hash-'));
    try {
      const file = path.join(tempDir, 'f.txt');
      await fs.writeFile(file, 'hello');
      expect(await generator.hashFile(file, 'md5')).toBe('5d41402abc4b2a76b9719d911017c592');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
