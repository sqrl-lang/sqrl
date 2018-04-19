/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
const NON_ASCII = /[^\x00-\x7F]/; // eslint-disable-line no-control-regex

export default function isAscii(text) {
  return !NON_ASCII.test(text);
}
