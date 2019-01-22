/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { VirtualSourceTree } from "../../sqrl/__tests__/helpers/runCompile";
import { register } from "../src";
import { buildTestFunctionRegistry, runSqrlTest } from "sqrl";

test("patternMatches works", async () => {
  const functionRegistry = await buildTestFunctionRegistry();
  register(functionRegistry);

  await runSqrlTest(
    `
LET Text := ["hello world"];
ASSERT patternMatches('BlacklistedKeywords.txt', Text) = []; # no hello

LET Text := ["hello world badkeyword"];
ASSERT patternMatches('BlacklistedKeywords.txt', Text) = ["badkeyword"];

LET Text := ["hello world baaaaaaaad21"];
ASSERT patternMatches('./BlacklistedKeywords.txt', Text) = ["baaaaaaaad2"];

LET Foo := "nothing to see here";
ASSERT patternMatches('./BlacklistedKeywords.txt', Foo) = [];

LET Foo := "it has badkeyword";
ASSERT patternMatches('./BlacklistedKeywords.txt', Foo) = ["badkeyword"];

LET Bar := ["This badkeyword thing is baaad20, or event bad21. It's a badkeywording thing"];
ASSERT patternMatches('./BlacklistedKeywords.txt', Bar) = [
  "badkeyword", "baaad2", "bad2"
];

    `,
    {
      functionRegistry,
      filesystem: new VirtualSourceTree({
        "BlacklistedKeywords.txt": "badkeyword\n" + "/ba+d2/\n"
      })
    }
  );
});