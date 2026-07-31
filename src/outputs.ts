import * as core from '@actions/core';
import type { OutputWriterContract } from './interfaces';

export class OutputWriter implements OutputWriterContract {
  writeOutputs(files: readonly string[]): void {
    const filesStr = files.join(' ');
    core.exportVariable('GOBUILD_FILES', filesStr);
    core.setOutput('gobuild_files', filesStr);
  }

  fail(message: string): void {
    core.setFailed(message);
  }
}
