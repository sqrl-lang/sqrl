/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export function jsonTemplate(
  strings: TemplateStringsArray,
  ...args: any[]
): string {
  return strings.reduce((accum: string, part: string, idx: number) => {
    return accum + JSON.stringify(args[idx - 1]) + part;
  });
}
