/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "./invariant";

export function mapRegExpMatches<T>(
  regexp: RegExp,
  haystack: string,
  map: (result: RegExpExecArray) => T
): T[] {
  invariant(regexp.global, "Expected global regexp");
  regexp.lastIndex = 0;

  let match: RegExpExecArray;
  const results: T[] = [];
  match = regexp.exec(haystack);
  while (match) {
    results.push(map(match));
    match = regexp.exec(haystack);
  }
  return results;
}
