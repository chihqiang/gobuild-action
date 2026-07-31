import type { CompressionFormat, GOARCH, GOOS } from './enums';

// ---------------- 数据模型 ----------------

export interface ActionInputs {
  readonly binName: string;
  readonly mainGo: string;
  readonly version: string;
  readonly addFiles: readonly string[];
  readonly distRootPath: string;
  readonly archs: string;
  readonly buildEnvs: string;
  readonly buildFlags: string;
}

export interface BuildTarget {
  readonly goos: GOOS;
  readonly goarch: GOARCH;
}

export interface BuildArtifact {
  readonly target: BuildTarget;
  readonly archivePath: string;
  readonly format: CompressionFormat;
}

export interface BuildOptions extends ActionInputs {
  readonly cwd?: string;
}

export interface ChecksumResult {
  readonly sha256Path?: string;
  readonly md5Path?: string;
}

export interface ExecResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal: NodeJS.Signals | null;
}

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdio?: 'pipe' | 'inherit';
}

// ---------------- 领域契约（依赖抽象） ----------------

export interface LoggerContract {
  step(message: string): void;
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export interface InputReaderContract {
  read(): ActionInputs;
}

export interface TargetParserContract {
  parse(archs: string): BuildTarget[];
}

export interface ArgumentParserContract {
  expandVars(input: string, vars: Record<string, string>): string;
  parseArgs(input: string): string[];
  parseEnvs(input: string): Record<string, string>;
}

export interface CommandRunnerContract {
  run(command: string, args: readonly string[], options?: RunOptions): Promise<ExecResult>;
}

export interface FileCopierContract {
  copy(files: readonly string[], destDir: string, cwd?: string): Promise<void>;
}

export interface ArtifactNamingContract {
  distDirName(target: BuildTarget, binName: string): string;
  binaryFileName(target: BuildTarget, binName: string): string;
  archiveFileName(target: BuildTarget, binName: string): string;
  compressionFormatFor(target: BuildTarget): CompressionFormat;
}

export interface BinaryBuilderContract {
  goVersion(): Promise<string>;
  build(target: BuildTarget, options: BuildOptions): Promise<string>;
}

export interface ArchivePackerContract {
  pack(distDir: string, archivePath: string, format: CompressionFormat): Promise<void>;
}

export interface ChecksumGeneratorContract {
  generate(distRootPath: string, binName: string, version: string): Promise<ChecksumResult>;
}

export interface OutputWriterContract {
  writeOutputs(files: readonly string[]): void;
  fail(message: string): void;
}

export interface BuildDependencies {
  readonly inputReader: InputReaderContract;
  readonly targetParser: TargetParserContract;
  readonly binaryBuilder: BinaryBuilderContract;
  readonly archivePacker: ArchivePackerContract;
  readonly checksumGenerator: ChecksumGeneratorContract;
  readonly outputWriter: OutputWriterContract;
  readonly artifactNaming: ArtifactNamingContract;
  readonly logger: LoggerContract;
}
