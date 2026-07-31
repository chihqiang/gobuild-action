import { GOARCH, GOOS, isGOARCH, isGOOS } from './enums';
import type { BuildTarget, TargetParserContract } from './interfaces';

export class TargetParser implements TargetParserContract {
  parse(archs: string): BuildTarget[] {
    const targets: BuildTarget[] = [];
    for (const raw of archs.trim().split(/\s+/)) {
      if (raw) {
        targets.push(this.parseOne(raw));
      }
    }
    return targets;
  }

  private parseOne(raw: string): BuildTarget {
    const parts = raw.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid build target "${raw}", expected format: GOOS/GOARCH`);
    }
    const goosRaw = parts[0]!;
    const goarchRaw = parts[1]!;
    if (!isGOOS(goosRaw)) {
      throw new Error(`Unsupported GOOS "${goosRaw}" in target "${raw}", supported: ${Object.values(GOOS).join(', ')}`);
    }
    if (!isGOARCH(goarchRaw)) {
      throw new Error(`Unsupported GOARCH "${goarchRaw}" in target "${raw}", supported: ${Object.values(GOARCH).join(', ')}`);
    }
    return { goos: goosRaw, goarch: goarchRaw };
  }
}
