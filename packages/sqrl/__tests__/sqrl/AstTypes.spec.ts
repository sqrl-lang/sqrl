/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
type autogen_any = any;
import { AstTypes as AT } from "../../src/ast/AstTypes";
import SqrlAst from "../../src/ast/SqrlAst";
import { runSqrlTest } from "../../src";

const func: autogen_any = "myCoolFunction";

function getError(fn?: autogen_any): autogen_any {
  try {
    return fn();
  } catch (err) {
    return err.toString();
  }
}

test("works", async () => {
  const types = [AT.constant.string, AT.feature, AT.any, AT.any.optional];

  AT.compileTypesInvariant(
    SqrlAst.call(func, [
      SqrlAst.constant("hello"),
      SqrlAst.feature("Joe"),
      SqrlAst.call("anything", []),
      SqrlAst.constant("optional")
    ]),
    types
  );

  AT.compileTypesInvariant(
    SqrlAst.call(func, [
      SqrlAst.constant("hello"),
      SqrlAst.feature("Joe"),
      SqrlAst.call("anything", [])
    ]),
    types
  );

  expect(
    getError(
      (): autogen_any =>
        AT.compileTypesInvariant(
          SqrlAst.call(func, [
            SqrlAst.constant("hello"),
            SqrlAst.feature("Joe")
          ]),
          types
        )
    )
  ).toEqual(
    "Argument count to call of myCoolFunction did not match. Expected 3 to 4 arguments but got 2."
  );

  expect(() =>
    AT.compileTypesInvariant(
      SqrlAst.call(func, [
        SqrlAst.include("x"),
        SqrlAst.include("y"),
        SqrlAst.include("z")
      ]),
      types
    )
  ).toThrowError(/Expected argument to be a constant string/);
});

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
  await expect(runSqrlTest("LET V := max();")).rejects.toThrow(
    /Expected at least 1 argument but got 0/
  );
  await expect(runSqrlTest("LET V := max(1);")).resolves.toBeTruthy();
  await expect(runSqrlTest("LET V := max(1,2);")).resolves.toBeTruthy();
  await expect(runSqrlTest("LET V := max(1,2,3);")).resolves.toBeTruthy();

  await expect(runSqrlTest("LET V := log10();")).rejects.toThrow(
    /Expected 1 argument but got 0./
  );
  await expect(runSqrlTest("LET V := log10(1);")).resolves.toBeTruthy();
  await expect(runSqrlTest("LET V := log10(1,2);")).rejects.toThrow(
    /Expected 1 argument but got 2./
  );
});
