/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { parseSqrl } from "../../src/parser/SqrlParse";

test("Basic parser works", () => {
  expect(parseSqrl("LET X := 5;").statements[0].type).toEqual("let");
});
