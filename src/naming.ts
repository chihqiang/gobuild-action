import { CompressionFormat, GOOS } from './enums';
import type { ArtifactNamingContract, BuildTarget } from './interfaces';

export class ArtifactNaming implements ArtifactNamingContract {
  distDirName(target: BuildTarget, binName: string): string {
    return `${binName}_${target.goos}_${target.goarch}`;
  }

  binaryFileName(target: BuildTarget, binName: string): string {
    return target.goos === GOOS.Windows ? `${binName}.exe` : binName;
  }

  compressionFormatFor(target: BuildTarget): CompressionFormat {
    return target.goos === GOOS.Windows ? CompressionFormat.Zip : CompressionFormat.TarGz;
  }

  archiveFileName(target: BuildTarget, binName: string): string {
    return `${binName}_${target.goos}_${target.goarch}.${this.compressionFormatFor(target)}`;
  }
}
