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
