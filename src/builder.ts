import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ArgumentParserContract,
  ArtifactNamingContract,
  BinaryBuilderContract,
  BuildOptions,
  BuildTarget,
  CommandRunnerContract,
  FileCopierContract,
  LoggerContract,
} from './interfaces';

export class GoBinaryBuilder implements BinaryBuilderContract {
  constructor(
    private readonly runner: CommandRunnerContract,
    private readonly argumentParser: ArgumentParserContract,
    private readonly fileCopier: FileCopierContract,
    private readonly artifactNaming: ArtifactNamingContract,
    private readonly logger: LoggerContract,
  ) {}

  async goVersion(): Promise<string> {
    const result = await this.runner.run('go', ['version']);
    return result.stdout.trim();
  }

  async build(target: BuildTarget, options: BuildOptions): Promise<string> {
    const cwd = options.cwd ?? process.cwd();
    const distDir = path.join(options.distRootPath, this.artifactNaming.distDirName(target, options.binName));
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });

    const outputPath = path.join(distDir, this.artifactNaming.binaryFileName(target, options.binName));

    const flags = this.argumentParser.parseArgs(this.argumentParser.expandVars(options.buildFlags, { VERSION: options.version }));
    const env = {
      ...process.env,
      GOOS: target.goos,
      GOARCH: target.goarch,
      ...this.argumentParser.parseEnvs(options.buildEnvs),
    };

    const args = ['build', ...flags, '-o', outputPath, options.mainGo];
    this.logger.info(`$ GOOS=${target.goos} GOARCH=${target.goarch} go ${this.formatCommand(args)}`);

    const result = await this.runner.run('go', args, {
      cwd,
      env,
      stdio: 'inherit',
    });
    if (result.code !== 0) {
      throw new Error(`Go build failed for ${target.goos}/${target.goarch}`);
    }

    await this.fileCopier.copy(options.addFiles, distDir, cwd);
    return outputPath;
  }

  private formatCommand(args: readonly string[]): string {
    return args.map((arg) => (arg.includes(' ') ? `'${arg}'` : arg)).join(' ');
  }
}
