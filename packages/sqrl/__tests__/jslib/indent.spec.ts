/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { indent } from "../../src/jslib/indent";

test("works", () => {
  expect(indent("hello\nworld", 2)).toEqual("  hello\n  world");
  expect(indent("  hello\nworld", 1)).toEqual("   hello\n world");
});
