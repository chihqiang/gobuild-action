import type { ArgumentParserContract } from './interfaces';

export class ShellArgumentParser implements ArgumentParserContract {
  expandVars(input: string, vars: Record<string, string>): string {
    return input.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) =>
      name in vars ? vars[name]! : match,
    );
  }

  parseArgs(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let hasToken = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (inSingle) {
        if (ch === "'") {
          inSingle = false;
        } else {
          current += ch;
        }
      } else if (inDouble) {
        if (ch === '"') {
          inDouble = false;
        } else if (ch === '\\' && i + 1 < input.length && (input[i + 1] === '"' || input[i + 1] === '\\' || input[i + 1] === '$')) {
          current += input[++i];
        } else {
          current += ch;
        }
      } else if (ch === "'") {
        inSingle = true;
        hasToken = true;
      } else if (ch === '"') {
        inDouble = true;
        hasToken = true;
      } else if (ch === '\\' && i + 1 < input.length) {
        current += input[++i];
        hasToken = true;
      } else if (ch === ' ' || ch === '\t' || ch === '\n') {
        if (hasToken) {
          args.push(current);
          current = '';
          hasToken = false;
        }
      } else {
        current += ch;
        hasToken = true;
      }
    }

    if (hasToken) {
      args.push(current);
    }
    if (inSingle || inDouble) {
      throw new Error('Unbalanced quotes in input');
    }
    return args;
  }

  parseEnvs(input: string): Record<string, string> {
    const envs: Record<string, string> = {};
    for (const token of this.parseArgs(input)) {
      const eq = token.indexOf('=');
      if (eq <= 0) {
        throw new Error(`Invalid environment assignment: "${token}"`);
      }
      envs[token.slice(0, eq)] = token.slice(eq + 1);
    }
    return envs;
  }
}
