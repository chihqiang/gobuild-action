import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GOARCH, GOOS } from '../src/enums';
import { ExtraFileCopier } from '../src/fileCopier';
import { ArtifactNaming } from '../src/naming';
import { CommandRunner } from '../src/commandRunner';
import { ShellArgumentParser } from '../src/arguments';
import { GoBinaryBuilder } from '../src/builder';
import type { LoggerContract } from '../src/interfaces';

function hostTarget(): { goos: GOOS; goarch: GOARCH } {
  const goosMap: Record<string, GOOS> = {
    darwin: GOOS.Darwin,
    linux: GOOS.Linux,
    win32: GOOS.Windows,
  };
  const archMap: Record<string, GOARCH> = {
    arm64: GOARCH.Arm64,
    x64: GOARCH.Amd64,
  };
  return {
    goos: goosMap[process.platform] ?? GOOS.Linux,
    goarch: archMap[process.arch] ?? GOARCH.Amd64,
  };
}

describe('ExtraFileCopier.copy', () => {
  const copier = new ExtraFileCopier();

  it('copies files and skips missing ones', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gobuild-copy-'));
    try {
      const src = path.join(tempDir, 'LICENSE');
      const dest = path.join(tempDir, 'out');
      await fs.writeFile(src, 'license text');
      await fs.mkdir(dest);
      await copier.copy(['LICENSE', 'missing.txt'], dest, tempDir);
      const copied = await fs.readFile(path.join(dest, 'LICENSE'), 'utf8');
      expect(copied).toBe('license text');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('GoBinaryBuilder (integration)', () => {
  const logger = {
    step: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  } satisfies LoggerContract;
  const builder = new GoBinaryBuilder(
    new CommandRunner(),
    new ShellArgumentParser(),
    new ExtraFileCopier(),
    new ArtifactNaming(),
    logger,
  );

  it('reports go version', async () => {
    const goCheck = await new CommandRunner().run('go', ['version']);
    if (goCheck.code !== 0) {
      return;
    }
    const version = await builder.goVersion();
    expect(version).toMatch(/^go version/);
  });

  it('builds a Go binary and injects version', async () => {
    const goCheck = await new CommandRunner().run('go', ['version']);
    if (goCheck.code !== 0) {
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gobuild-integ-'));
    try {
      await fs.writeFile(
        path.join(tempDir, 'main.go'),
        'package main\n\nimport "fmt"\n\nvar version = "dev"\n\nfunc main() { fmt.Println(version) }\n',
      );

      const options = {
        binName: 'integ',
        mainGo: 'main.go',
        version: '9.9.9',
        addFiles: ['LICENSE'],
        archs: '',
        distRootPath: path.join(tempDir, 'dist'),
        buildEnvs: 'CGO_ENABLED=0',
        buildFlags: `-ldflags '-s -w -X main.version=${'${VERSION}'}'`,
        cwd: tempDir,
      };
      await fs.writeFile(path.join(tempDir, 'LICENSE'), 'mit');

      logger.info.mockClear();
      const binaryPath = await builder.build(hostTarget(), options);

      const printed = logger.info.mock.calls.map((c) => c[0] as string).join('\n');
      expect(printed).toContain('$ GOOS=');
      expect(printed).toContain('-ldflags');
      expect(printed).toContain(`main.version=9.9.9`);
      expect(printed).toContain('main.go');

      const host = hostTarget();
      await expect(fs.stat(binaryPath)).resolves.toBeTruthy();
      await expect(
        fs.stat(path.join(tempDir, 'dist', `integ_${host.goos}_${host.goarch}`, 'LICENSE')),
      ).resolves.toBeTruthy();

      const result = await new CommandRunner().run(binaryPath, []);
      expect(result.stdout.trim()).toBe('9.9.9');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }, 60000);
});
