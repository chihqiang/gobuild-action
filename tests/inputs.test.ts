import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setOutput, exportVariable, setFailed } = vi.hoisted(() => ({
  setOutput: vi.fn(),
  exportVariable: vi.fn(),
  setFailed: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  getInput: (name: string) => {
    const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
    return (process.env[key] ?? '').trim();
  },
  setOutput,
  exportVariable,
  setFailed,
}));

import { InputReader } from '../src/inputs';
import { OutputWriter } from '../src/outputs';

describe('InputReader', () => {
  const reader = new InputReader();
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, GITHUB_REF_NAME: 'v1.2.3' };
    delete process.env.INPUT_BIN_NAME;
    delete process.env.INPUT_MAIN_GO;
    delete process.env.INPUT_VERSION;
    delete process.env.INPUT_ADD_FILES;
    delete process.env.INPUT_DIST_ROOT_PATH;
    delete process.env.INPUT_ARCHS;
    delete process.env.INPUT_BUILD_ENVS;
    delete process.env.INPUT_BUILD_FLAGS;
  });

  afterEach(() => {
    process.env = env;
  });

  it('applies defaults', () => {
    process.env.INPUT_BIN_NAME = 'myapp';
    const inputs = reader.read();
    expect(inputs.binName).toBe('myapp');
    expect(inputs.mainGo).toBe('main.go');
    expect(inputs.version).toBe('v1.2.3');
    expect(inputs.addFiles).toEqual([]);
    expect(inputs.distRootPath).toBe('dist');
    expect(inputs.buildEnvs).toBe('CGO_ENABLED=0');
    expect(inputs.buildFlags).toContain('main.version=v1.2.3');
    expect(inputs.archs).toContain('linux/amd64');
  });

  it('reads explicit inputs', () => {
    process.env.INPUT_BIN_NAME = 'tool';
    process.env.INPUT_MAIN_GO = './cmd/tool';
    process.env.INPUT_VERSION = '2.0.0';
    process.env.INPUT_ADD_FILES = 'README.md LICENSE';
    process.env.INPUT_DIST_ROOT_PATH = 'out';
    process.env.INPUT_ARCHS = 'linux/amd64';
    process.env.INPUT_BUILD_ENVS = 'CGO_ENABLED=1';
    process.env.INPUT_BUILD_FLAGS = '-trimpath';

    const inputs = reader.read();
    expect(inputs).toEqual({
      binName: 'tool',
      mainGo: './cmd/tool',
      version: '2.0.0',
      addFiles: ['README.md', 'LICENSE'],
      distRootPath: 'out',
      archs: 'linux/amd64',
      buildEnvs: 'CGO_ENABLED=1',
      buildFlags: '-trimpath',
    });
  });

  it('defaults version to ref name', () => {
    const inputs = reader.read();
    expect(inputs.version).toBe('v1.2.3');
  });
});

describe('OutputWriter', () => {
  const writer = new OutputWriter();

  beforeEach(() => {
    setOutput.mockClear();
    exportVariable.mockClear();
    setFailed.mockClear();
  });

  it('writes output and legacy env variable', () => {
    const files = ['dist/a.tar.gz', 'dist/a_checksums.sha256'];
    writer.writeOutputs(files);
    expect(exportVariable).toHaveBeenCalledWith(
      'GOBUILD_FILES',
      'dist/a.tar.gz dist/a_checksums.sha256',
    );
    expect(setOutput).toHaveBeenCalledWith(
      'gobuild_files',
      'dist/a.tar.gz dist/a_checksums.sha256',
    );
  });

  it('fails the action', () => {
    writer.fail('boom');
    expect(setFailed).toHaveBeenCalledWith('boom');
  });
});
