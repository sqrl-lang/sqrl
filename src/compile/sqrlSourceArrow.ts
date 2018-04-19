/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export function sqrlSourceArrow(location?): string {
  const { start, end, source } = location;
  const sourceLines = source.split("\n");

  let output = "";
  for (let line = start.line; line <= end.line; line++) {
    const source = sourceLines[line - 1];
    const left = line > start.line ? 0 : start.column - 1;
    const right = line < end.line ? source.length : end.column - 1;
    output += source + "\n";
    output += " ".repeat(left) + "^".repeat(right - left) + "\n";
  }

  return output;
}
