/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { bufferToHexEncodedAscii } from "../../src/jslib/bufferToHexEncodedAscii";

test("works", () => {
  const hello = Buffer.from("hello");
  expect(bufferToHexEncodedAscii(hello)).toEqual("hello");
  expect(
    bufferToHexEncodedAscii(Buffer.concat([Buffer.from([0]), hello]))
  ).toEqual("\\x00hello");
  expect(
    bufferToHexEncodedAscii(Buffer.from(`one\ntwo\nslash\\slash\n`))
  ).toEqual("one\\x0atwo\\x0aslash\\x5cslash\\x0a");
});
