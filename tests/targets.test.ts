import { describe, expect, it } from 'vitest';
import { GOARCH, GOOS } from '../src/enums';
import { TargetParser } from '../src/targets';

const parser = new TargetParser();

describe('TargetParser.parse', () => {
  it('parses a valid target', () => {
    expect(parser.parse('linux/amd64')).toEqual([
      { goos: GOOS.Linux, goarch: GOARCH.Amd64 },
    ]);
  });

  it('rejects malformed targets', () => {
    expect(() => parser.parse('linux')).toThrow(/Invalid build target/);
    expect(() => parser.parse('linux/amd64/extra')).toThrow(/Invalid build target/);
  });

  it('rejects unsupported goos', () => {
    expect(() => parser.parse('unknown/amd64')).toThrow(/Unsupported GOOS/);
  });

  it('rejects unsupported goarch', () => {
    expect(() => parser.parse('linux/unknownarch')).toThrow(/Unsupported GOARCH/);
  });

  it('accepts full go tool dist list values', () => {
    expect(parser.parse('js/wasm')).toEqual([{ goos: GOOS.Js, goarch: GOARCH.Wasm }]);
    expect(parser.parse('plan9/386')).toEqual([{ goos: GOOS.Plan9, goarch: GOARCH.X86 }]);
    expect(parser.parse('linux/mips64le')).toEqual([
      { goos: GOOS.Linux, goarch: GOARCH.Mips64Le },
    ]);
  });

  it('parses multiple targets', () => {
    const targets = parser.parse('windows/amd64 linux/arm64 darwin/amd64');
    expect(targets).toHaveLength(3);
    expect(targets[0]).toEqual({ goos: GOOS.Windows, goarch: GOARCH.Amd64 });
  });

  it('handles extra whitespace', () => {
    expect(parser.parse('  linux/amd64   linux/arm64 ')).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parser.parse('')).toEqual([]);
  });
});
