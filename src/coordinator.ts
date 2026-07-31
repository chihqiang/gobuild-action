import fs from 'node:fs/promises';
import path from 'node:path';
import type { ActionInputs, BuildArtifact, BuildDependencies, BuildTarget } from './interfaces';

export class BuildCoordinator {
  constructor(private readonly deps: BuildDependencies) {}

  async run(): Promise<void> {
    const { inputReader, targetParser, binaryBuilder, checksumGenerator, outputWriter, logger } = this.deps;
    try {
      const inputs = inputReader.read();
      const targets = targetParser.parse(inputs.archs);
      if (targets.length === 0) {
        throw new Error('No build targets specified');
      }

      logger.step('Go version:');
      logger.info(await binaryBuilder.goVersion());

      await fs.mkdir(inputs.distRootPath, { recursive: true });

      const artifacts = await Promise.all(targets.map((t) => this.buildAndPackage(t, inputs)));

      logger.step('Generating checksums...');
      const checksums = await checksumGenerator.generate(inputs.distRootPath, inputs.binName, inputs.version);
      if (checksums.sha256Path) {
        logger.success(`Checksums generated in ${inputs.distRootPath}`);
      } else {
        logger.info('No archives found, skipping checksum generation.');
      }

      await this.listOutputs(inputs.distRootPath);

      const outputFiles = [
        ...artifacts.map((a) => a.archivePath),
        ...(checksums.sha256Path ? [checksums.sha256Path] : []),
        ...(checksums.md5Path ? [checksums.md5Path] : []),
      ].sort();
      outputWriter.writeOutputs(outputFiles);
      logger.success(`Build finished, outputs: ${outputFiles.join(' ')}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(message);
      outputWriter.fail(message);
      process.exitCode = 1;
    }
  }

  private async buildAndPackage(target: BuildTarget, inputs: ActionInputs): Promise<BuildArtifact> {
    const { binaryBuilder, archivePacker, artifactNaming, logger } = this.deps;
    logger.step(`Building ${inputs.binName} for ${target.goos}/${target.goarch}, version: ${inputs.version}`);
    const binaryPath = await binaryBuilder.build(target, inputs);
    logger.success(`Built: ${binaryPath}`);

    const distDir = path.join(inputs.distRootPath, artifactNaming.distDirName(target, inputs.binName));
    const format = artifactNaming.compressionFormatFor(target);
    const archivePath = path.join(inputs.distRootPath, artifactNaming.archiveFileName(target, inputs.binName));
    await archivePacker.pack(distDir, archivePath, format);
    logger.success(`Packed: ${archivePath}`);
    return { target, archivePath, format };
  }

  private async listOutputs(distRootPath: string): Promise<void> {
    const { logger } = this.deps;
    const entries = await fs.readdir(distRootPath, { withFileTypes: true });
    logger.step('Build outputs:');
    for (const entry of entries.filter((e) => e.isFile()).sort()) {
      const stat = await fs.stat(path.join(distRootPath, entry.name));
      const size = (stat.size / 1024).toFixed(1);
      logger.info(`  ${entry.name}  (${size} KB)`);
    }
  }
}
