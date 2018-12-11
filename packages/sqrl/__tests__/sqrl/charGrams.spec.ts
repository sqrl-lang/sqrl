/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrl } from "../helpers/sqrlTest";

test("charGrams", async () => {
  await runSqrl(`
LET ActorEmail := "abc123def";
LET SimpleString := "abcdefghi";
LET CharTriGrams := charGrams(SimpleString, 3);
LET CharBiGrams := charGrams(SimpleString, 2);
LET CharGrams := charGrams(SimpleString, 1);

ASSERT CharTriGrams = [
    "abc",
    "bcd",
    "cde",
    "def",
    "efg",
    "fgh",
    "ghi"
  ];

ASSERT CharBiGrams = [
    "ab",
    "bc",
    "cd",
    "de",
    "ef",
    "fg",
    "gh",
    "hi"
  ];

ASSERT CharGrams = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i"
  ];
    `);
});
