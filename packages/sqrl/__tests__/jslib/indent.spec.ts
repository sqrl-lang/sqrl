import { indent } from "../../src/jslib/indent";

test("works", () => {
  expect(indent("hello\nworld", 2)).toEqual("  hello\n  world");
  expect(indent("  hello\nworld", 1)).toEqual("   hello\n world");
});
