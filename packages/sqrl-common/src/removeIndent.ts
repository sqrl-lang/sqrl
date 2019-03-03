/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { invariant } from "./invariant";

/**
 * Removes the indent on given lines, useful for adding docstrings to formatted code
 */
export function removeIndent(str: string) {
  invariant(
    str.substring(0, 1) === "\n",
    "Expected removeIndent() strings to start with a new line"
  );
  const text = str.substring(1).trimRight();
  const indentLength = /^ */.exec(text)[0].length;
  return text.replace(new RegExp(`^ {${indentLength}}`, "mg"), "");
}
