/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { PatternService } from "./PatternFunctions";
import { nice } from "node-nice";

// Regular expression looking for a regular expression
const REGEXP_REGEXP = /^\/(.*)\/([a-z]*)$/;

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

function escapeRegExp(str: string): string {
  return str.replace(matchOperatorsRe, "\\$&");
}

interface GenericRegExp {
  lastIndex: number;
  exec(content: string): string[]
}
export type CreateRegExp = (source, flags) => GenericRegExp;

class RegisteredPattern {
  private regExp: GenericRegExp;
  constructor(regExp: GenericRegExp) {
    this.regExp = regExp;
  }

  match(content: string): Promise<string[]> {
    return nice(() => {
      this.regExp.lastIndex = 0;
      const rv = [];
      let match = this.regExp.exec(content);
      while (match) {
        rv.push(match[0]);
        match = this.regExp.exec(content);
      }
      return rv;
    });
  }
}

/**
 * This is a simple class that runs regular expressions in the same process.
 * For production scale use cases it is recommended to split this off into a
 * separate process or service so that it does not block the event loop.
 */
export class InProcessPatternService implements PatternService {
  private patterns: {
    [source: string]: RegisteredPattern;
  };

  constructor(private createRegExp: CreateRegExp) {
    this.patterns = {};
  }

  private register(pattern: string): RegisteredPattern {
    const match = REGEXP_REGEXP.exec(pattern);

    if (match) {
      // Use the provided regular expression as is.
      const [, source, flags] = match;
      return new RegisteredPattern(this.createRegExp(source, flags + 'g'));
    } else if (pattern.startsWith('"') && pattern.endsWith('"')) {
      // Do an exact match search
      return new RegisteredPattern(this.createRegExp(escapeRegExp(pattern.slice(1, -1)), "g"));
    } else {
      // Do a fuzzy match, this could be improved but for now just search with word boundaries and
      // case insensitive
      return new RegisteredPattern(this.createRegExp("\\b" + escapeRegExp(pattern) + "\\b", "gi"));
    }
  }

  public matches(pattern: string, s: string): Promise<string[]> {
    if (!this.patterns.hasOwnProperty(pattern)) {
      this.patterns[pattern] = this.register(pattern);
    }
    return this.patterns[pattern].match(s);
  }
}
