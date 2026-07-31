import { describe, expect, it } from 'vitest';
import { CompressionFormat, GOARCH, GOOS } from '../src/enums';
import { ArtifactNaming } from '../src/naming';

const naming = new ArtifactNaming();

describe('ArtifactNaming', () => {
  it('combines bin name with target for dist dir', () => {
    expect(naming.distDirName({ goos: GOOS.Linux, goarch: GOARCH.Amd64 }, 'myapp')).toBe(
      'myapp_linux_amd64',
    );
  });

  it('appends .exe for windows binary', () => {
    expect(naming.binaryFileName({ goos: GOOS.Windows, goarch: GOARCH.Amd64 }, 'myapp')).toBe(
      'myapp.exe',
    );
  });

  it('keeps binary name for unix targets', () => {
    expect(naming.binaryFileName({ goos: GOOS.Linux, goarch: GOARCH.Arm64 }, 'myapp')).toBe('myapp');
  });

  it('uses zip for windows', () => {
    expect(naming.compressionFormatFor({ goos: GOOS.Windows, goarch: GOARCH.Amd64 })).toBe(
      CompressionFormat.Zip,
    );
  });

  it('uses tar.gz otherwise', () => {
    expect(naming.compressionFormatFor({ goos: GOOS.Linux, goarch: GOARCH.Arm64 })).toBe(
      CompressionFormat.TarGz,
    );
  });

  it('builds windows zip archive name', () => {
    expect(naming.archiveFileName({ goos: GOOS.Windows, goarch: GOARCH.Amd64 }, 'myapp')).toBe(
      'myapp_windows_amd64.zip',
    );
  });

  it('builds linux tar.gz archive name', () => {
    expect(naming.archiveFileName({ goos: GOOS.Linux, goarch: GOARCH.Amd64 }, 'myapp')).toBe(
      'myapp_linux_amd64.tar.gz',
    );
  });
});
