import * as core from '@actions/core';
import path from 'node:path';
import type { ActionInputs, InputReaderContract } from './interfaces';

export class InputReader implements InputReaderContract {
  read(): ActionInputs {
    const version = core.getInput('version') || process.env.GITHUB_REF_NAME || 'main';
    const binName = core.getInput('bin_name') || path.basename(process.cwd());
    return {
      binName,
      mainGo: core.getInput('main_go') || 'main.go',
      version,
      addFiles: core.getInput('add_files').split(/\s+/).filter(Boolean),
      distRootPath: core.getInput('dist_root_path') || 'dist',
      archs: core.getInput('archs') ||
        'windows/amd64 windows/arm64 linux/amd64 linux/arm64 darwin/amd64 darwin/arm64',
      buildEnvs: core.getInput('build_envs') || 'CGO_ENABLED=0',
      buildFlags: core.getInput('build_flags') ||
        `-ldflags '-s -w -X main.version=\${VERSION}'`,
    };
  }
}
