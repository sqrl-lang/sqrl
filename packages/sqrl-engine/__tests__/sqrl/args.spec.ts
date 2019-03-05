/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../../src/ast/AstTypes";
import { runSqrlTest } from "../../src";

test("runtime checks", async () => {
  AT.any.string.runtimeChecker("hey hey");
  expect(AT.any.string.runtimeChecker(67)).toEqual(
    "Expected type string but was number"
  );

  AT.any.number.runtimeChecker(67);
  expect(AT.any.number.runtimeChecker("hey hey")).toEqual(
    "Expected type number but was string"
  );
});

test("tests inside sqrl", async () => {
  await expect(runSqrlTest("LET V := concat();")).rejects.toThrow(
    /Expected at least 2 arguments but got 0/
  );
  await expect(runSqrlTest("LET V := concat(1);")).rejects.toThrow(
    /Expected at least 2 arguments but got 1/
  );
  await expect(runSqrlTest("LET V := concat(1,2);")).resolves.toBeTruthy();
  await expect(runSqrlTest("LET V := concat(1,2,3);")).resolves.toBeTruthy();

  await expect(runSqrlTest("LET V := log10();")).rejects.toThrow(
    /Expected 1 argument but got 0./
  );
  await expect(runSqrlTest("LET V := log10(1);")).resolves.toBeTruthy();
  await expect(runSqrlTest("LET V := log10(1,2);")).rejects.toThrow(
    /Expected 1 argument but got 2./
  );
});
