import { describe, expect, it } from 'vitest';
import { ShellArgumentParser } from '../src/arguments';

const parser = new ShellArgumentParser();

describe('ShellArgumentParser.parseArgs', () => {
  it('splits space separated tokens', () => {
    expect(parser.parseArgs('-s -w -o out')).toEqual(['-s', '-w', '-o', 'out']);
  });

  it('handles single quotes', () => {
    expect(parser.parseArgs(`-ldflags '-s -w -X main.version=1.0'`)).toEqual([
      '-ldflags',
      '-s -w -X main.version=1.0',
    ]);
  });

  it('handles double quotes with escapes', () => {
    expect(parser.parseArgs(`-X "main.foo=\\"bar\\""`)).toEqual(['-X', 'main.foo="bar"']);
  });

  it('handles backslash escapes', () => {
    expect(parser.parseArgs(`--name=a\\ b`)).toEqual(['--name=a b']);
  });

  it('ignores repeated whitespace', () => {
    expect(parser.parseArgs('a  b\tc\n d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns empty array for empty input', () => {
    expect(parser.parseArgs('')).toEqual([]);
    expect(parser.parseArgs('   ')).toEqual([]);
  });

  it('throws on unbalanced quotes', () => {
    expect(() => parser.parseArgs(`'unclosed`)).toThrow();
  });
});

describe('ShellArgumentParser.expandVars', () => {
  it('expands known placeholders', () => {
    expect(parser.expandVars('${VERSION}', { VERSION: '1.0.0' })).toBe('1.0.0');
  });

  it('keeps unknown placeholders untouched', () => {
    expect(parser.expandVars('-X ${UNKNOWN}', { VERSION: '1.0.0' })).toBe('-X ${UNKNOWN}');
  });

  it('expands multiple occurrences', () => {
    expect(parser.expandVars('${VERSION}/${VERSION}', { VERSION: 'v1' })).toBe('v1/v1');
  });
});

describe('ShellArgumentParser.parseEnvs', () => {
  it('parses key=value pairs', () => {
    expect(parser.parseEnvs('CGO_ENABLED=0 GOFLAGS=-mod=vendor')).toEqual({
      CGO_ENABLED: '0',
      GOFLAGS: '-mod=vendor',
    });
  });

  it('supports quoted values with spaces', () => {
    expect(parser.parseEnvs(`FOO='a b'`)).toEqual({ FOO: 'a b' });
  });

  it('throws on tokens without equals sign', () => {
    expect(() => parser.parseEnvs('CGO_ENABLED=0 BROKEN')).toThrow();
  });
});
