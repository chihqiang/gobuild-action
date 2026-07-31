import { ShellArgumentParser } from './arguments';
import { GoBinaryBuilder } from './builder';
import { ChecksumGenerator } from './checksum';
import { CommandRunner } from './commandRunner';
import { BuildCoordinator } from './coordinator';
import { ExtraFileCopier } from './fileCopier';
import { InputReader } from './inputs';
import { Logger } from './logger';
import { ArtifactNaming } from './naming';
import { OutputWriter } from './outputs';
import { ArchivePacker } from './packer';
import { TargetParser } from './targets';

const artifactNaming = new ArtifactNaming();
const logger = new Logger();
const coordinator = new BuildCoordinator({
  inputReader: new InputReader(),
  targetParser: new TargetParser(),
  binaryBuilder: new GoBinaryBuilder(
    new CommandRunner(),
    new ShellArgumentParser(),
    new ExtraFileCopier(),
    artifactNaming,
    logger,
  ),
  archivePacker: new ArchivePacker(),
  checksumGenerator: new ChecksumGenerator(),
  outputWriter: new OutputWriter(),
  artifactNaming,
  logger,
});

void coordinator.run();
