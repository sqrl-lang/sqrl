/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../../src/ast/AstTypes";
import SqrlAst from "../../src/ast/SqrlAst";

const func = "myCoolFunction";

test("works", async () => {
  const types = [AT.constant.string, AT.feature, AT.any, AT.any.optional];

  AT.compileTypesInvariant(
    SqrlAst.call(func, [
      SqrlAst.constant("hello"),
      SqrlAst.feature("Joe"),
      SqrlAst.call("anything", []),
      SqrlAst.constant("optional"),
    ]),
    types
  );

  AT.compileTypesInvariant(
    SqrlAst.call(func, [
      SqrlAst.constant("hello"),
      SqrlAst.feature("Joe"),
      SqrlAst.call("anything", []),
    ]),
    types
  );

  expect(() =>
    AT.compileTypesInvariant(
      SqrlAst.call(func, [SqrlAst.constant("hello"), SqrlAst.feature("Joe")]),
      types
    )
  ).toThrow(
    "Argument count to call of myCoolFunction did not match. Expected 3 to 4 arguments but got 2."
  );

  expect(() =>
    AT.compileTypesInvariant(
      SqrlAst.call(func, [
        SqrlAst.include("x"),
        SqrlAst.include("y"),
        SqrlAst.include("z"),
      ]),
      types
    )
  ).toThrowError(/Expected argument to be a constant string/);
});
