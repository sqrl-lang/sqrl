/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { parseExpr } from "../../src/parser/SqrlParse";

test("parses as a custom call", () => {
  expect(parseExpr("myfunc()")).toMatchObject({
    type: "call",
    func: "myfunc",
    args: [],
  });

  expect(
    parseExpr("myfunc()", {
      customFunctions: new Set(["otherfunc"]),
    })
  ).toMatchObject({
    type: "call",
    func: "myfunc",
    args: [],
  });

  expect(
    parseExpr("myfunc()", {
      customFunctions: new Set(["myfunc"]),
    })
  ).toMatchObject({
    type: "customCall",
    func: "myfunc",
    source: "",
  });
});

function parseArgs(sqrl: string) {
  const parsed = parseExpr(sqrl, {
    customFunctions: new Set(["f"]),
  });
  if (parsed.type !== "customCall") {
    throw new Error("Expected customCall result");
  }
  expect(parsed).toMatchObject({
    type: "customCall",
    func: "f",
  });
  return parsed.source;
}

function expectArgsParse(args: string) {
  expect(parseArgs(`f(${args})`)).toEqual(args);
}

test("works with example arguments", () => {
  // These should all parse fine, and the call source should be extracted
  expectArgsParse("1");
  expectArgsParse("1 BY 2");
  expectArgsParse("1 BY (2 * 3)");
  expectArgsParse("WITH A STRING 'It is a string!'");
  expectArgsParse("tricky STRING ')'");
  expectArgsParse("BY Ip GROUP BY User EVERY 30 DAYS");
  expectArgsParse('TAKE (30 * 2) WHERE User="Josh"');
  expectArgsParse("()");
  expectArgsParse("(-)");
  expectArgsParse(`¯\_(ツ)_/¯`);
  expectArgsParse("multi\nline");
  expectArgsParse("with a // comment");
  expectArgsParse("  spaces\n are untouched!");
  expectArgsParse("f(f(f()))");
  expectArgsParse("LET X := 1;");

  // Close brakets outside of strings not supported
  expect(() => expectArgsParse(")")).toThrowErrorMatchingSnapshot();
  expect(() => expectArgsParse(")(")).toThrowErrorMatchingSnapshot();

  // Close brakets even in a comment dont work
  expect(() => expectArgsParse("// )\n")).toThrowErrorMatchingSnapshot();

  // Open is in string, close is not
  expect(() =>
    expectArgsParse('bad "STRING (")')
  ).toThrowErrorMatchingSnapshot();

  // Backtick strings not accepted
  expect(() => expectArgsParse("bad `)`")).toThrowErrorMatchingSnapshot();
});
