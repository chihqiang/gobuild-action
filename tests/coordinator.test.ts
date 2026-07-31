import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuildCoordinator } from '../src/coordinator';
import { CompressionFormat, GOARCH, GOOS } from '../src/enums';
import type {
  ActionInputs,
  ArchivePackerContract,
  ArtifactNamingContract,
  BinaryBuilderContract,
  BuildDependencies,
  ChecksumGeneratorContract,
  ChecksumResult,
  InputReaderContract,
  LoggerContract,
  OutputWriterContract,
  TargetParserContract,
} from '../src/interfaces';

const inputs: ActionInputs = {
  binName: 'demo',
  mainGo: 'main.go',
  version: 'v1.0.0',
  addFiles: [],
  distRootPath: 'dist',
  archs: 'linux/amd64 windows/amd64',
  buildEnvs: 'CGO_ENABLED=0',
  buildFlags: '-ldflags -s -w',
};

const linuxTarget = { goos: GOOS.Linux, goarch: GOARCH.Amd64 } as const;
const windowsTarget = { goos: GOOS.Windows, goarch: GOARCH.Amd64 } as const;

function createLoggerMock() {
  return {
    step: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  } satisfies LoggerContract;
}

function createDeps(overrides: Partial<BuildDependencies> = {}): {
  deps: BuildDependencies;
  inputReader: typeof inputReader;
  targetParser: typeof targetParser;
  binaryBuilder: typeof binaryBuilder;
  archivePacker: typeof archivePacker;
  checksumGenerator: typeof checksumGenerator;
  outputWriter: typeof outputWriter;
  artifactNaming: typeof artifactNaming;
  logger: typeof logger;
} {
  const logger = createLoggerMock();
  const inputReader = {
    read: vi.fn(() => inputs),
  } satisfies InputReaderContract;
  const targetParser = {
    parse: vi.fn(() => [linuxTarget, windowsTarget]),
  } satisfies TargetParserContract;
  const binaryBuilder = {
    goVersion: vi.fn(async () => 'go version go1.25 darwin/arm64'),
    build: vi.fn(async (target: { goos: GOOS; goarch: GOARCH }) =>
      `dist/${inputs.binName}_${target.goos}_${target.goarch}/${inputs.binName}`,
    ),
  } satisfies BinaryBuilderContract;
  const archivePacker = {
    pack: vi.fn(async () => undefined),
  } satisfies ArchivePackerContract;
  const checksumGenerator = {
    generate: vi.fn(async (): Promise<ChecksumResult> => ({
      sha256Path: 'dist/demo_v1.0.0_checksums.sha256',
      md5Path: 'dist/demo_v1.0.0_checksums.md5',
    })),
  } satisfies ChecksumGeneratorContract;
  const outputWriter = {
    writeOutputs: vi.fn(),
    fail: vi.fn(),
  } satisfies OutputWriterContract;
  const artifactNaming = {
    distDirName: vi.fn((target: { goos: GOOS; goarch: GOARCH }, bin: string) =>
      `${bin}_${target.goos}_${target.goarch}`,
    ),
    binaryFileName: vi.fn((_target: { goos: GOOS; goarch: GOARCH }, bin: string) => bin),
    archiveFileName: vi.fn((target: { goos: GOOS; goarch: GOARCH }, bin: string) =>
      `${bin}_${target.goos}_${target.goarch}.tar.gz`,
    ),
    compressionFormatFor: vi.fn(() => CompressionFormat.TarGz),
  } satisfies ArtifactNamingContract;

  const deps: BuildDependencies = {
    inputReader,
    targetParser,
    binaryBuilder,
    archivePacker,
    checksumGenerator,
    outputWriter,
    artifactNaming,
    logger,
    ...overrides,
  };
  return { deps, inputReader, targetParser, binaryBuilder, archivePacker, checksumGenerator, outputWriter, artifactNaming, logger };
}

describe('BuildCoordinator', () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it('builds, packs, checksums and writes outputs for every target', async () => {
    const { deps, binaryBuilder, archivePacker, checksumGenerator, outputWriter, artifactNaming } =
      createDeps();

    await new BuildCoordinator(deps).run();

    expect(binaryBuilder.build).toHaveBeenCalledTimes(2);
    expect(binaryBuilder.build).toHaveBeenCalledWith(linuxTarget, inputs);
    expect(binaryBuilder.build).toHaveBeenCalledWith(windowsTarget, inputs);

    expect(archivePacker.pack).toHaveBeenCalledTimes(2);
    expect(archivePacker.pack).toHaveBeenCalledWith(
      'dist/demo_linux_amd64',
      'dist/demo_linux_amd64.tar.gz',
      'tar.gz',
    );

    expect(checksumGenerator.generate).toHaveBeenCalledWith('dist', 'demo', 'v1.0.0');
    expect(artifactNaming.archiveFileName).toHaveBeenCalledTimes(2);

    const written = outputWriter.writeOutputs.mock.calls[0]![0] as readonly string[];
    expect(written).toEqual([
      'dist/demo_linux_amd64.tar.gz',
      'dist/demo_v1.0.0_checksums.md5',
      'dist/demo_v1.0.0_checksums.sha256',
      'dist/demo_windows_amd64.tar.gz',
    ]);
    expect(outputWriter.fail).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('fails the action when no targets are specified', async () => {
    const { deps, targetParser, outputWriter } = createDeps();
    targetParser.parse.mockImplementation(() => []);

    await new BuildCoordinator(deps).run();

    expect(outputWriter.fail).toHaveBeenCalledWith('No build targets specified');
    expect(outputWriter.writeOutputs).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('fails the action when the build throws', async () => {
    const { deps, binaryBuilder, outputWriter } = createDeps();
    binaryBuilder.build.mockImplementation(async () => {
      throw new Error('Go build failed for linux/amd64');
    });

    await new BuildCoordinator(deps).run();

    expect(outputWriter.fail).toHaveBeenCalledWith('Go build failed for linux/amd64');
    expect(outputWriter.writeOutputs).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('skips checksum output when no archives were generated', async () => {
    const { deps, checksumGenerator, outputWriter } = createDeps();
    checksumGenerator.generate.mockImplementation(async () => ({}));

    await new BuildCoordinator(deps).run();

    const written = outputWriter.writeOutputs.mock.calls[0]![0] as readonly string[];
    expect(written).toEqual([
      'dist/demo_linux_amd64.tar.gz',
      'dist/demo_windows_amd64.tar.gz',
    ]);
  });
});
