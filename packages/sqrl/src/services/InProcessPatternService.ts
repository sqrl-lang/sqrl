/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { PatternService } from "../function/PatternFunctions";
import { nice } from "node-nice";
import * as RE2 from "re2";

// Regular expression looking for a regular expression
const REGEXP_REGEXP = /^\/(.*)\/(i)?$/;

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

function escapeRegExp(str: string): string {
  return str.replace(matchOperatorsRe, "\\$&");
}

class RegisteredPattern {
  private re2: RE2;
  constructor(source: string, flags: string) {
    this.re2 = new RE2(source, flags + "g");
  }

  match(content: string): Promise<string[]> {
    return nice(() => {
      this.re2.lastIndex = 0;
      const rv = [];
      let match = this.re2.exec(content);
      while (match) {
        rv.push(match[0]);
        match = this.re2.exec(content);
      }
      return rv;
    });
  }
}

export class InProcessPatternService implements PatternService {
  private patterns: {
    [source: string]: RegisteredPattern;
  };

  constructor() {
    this.patterns = {};
  }

  private register(pattern: string): RegisteredPattern {
    const match = REGEXP_REGEXP.exec(pattern);

    if (match) {
      // Use the provided regular expression as is.
      const [, source, flags] = match;
      return new RegisteredPattern(source, flags);
    } else if (pattern.startsWith('"') && pattern.endsWith('"')) {
      // Do an exact match search
      return new RegisteredPattern(escapeRegExp(pattern.slice(1, -1)), "");
    } else {
      // Do a fuzzy match, this could be improved but for now just search with word boundaries and
      // case insensitive
      return new RegisteredPattern("\\b" + escapeRegExp(pattern) + "\\b", "i");
    }
  }

  public matches(pattern: string, s: string): Promise<string[]> {
    if (!this.patterns.hasOwnProperty(pattern)) {
      this.patterns[pattern] = this.register(pattern);
    }
    return this.patterns[pattern].match(s);
  }
}
