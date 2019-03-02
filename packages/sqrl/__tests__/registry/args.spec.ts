/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { buildFunctionRegistry, AT, ArgumentCheck } from "../../src/index";

test("throw with out of order optional", async () => {
  function tryRegister(args: ArgumentCheck[]) {
    const functionRegistry = buildFunctionRegistry();
    functionRegistry.registerSync(
      function hello() {
        return "world";
      },
      {
        args
      }
    );
  }

  tryRegister([AT.any]);
  tryRegister([AT.any, AT.any.repeated]);
  tryRegister([AT.any, AT.any.optional]);
  tryRegister([AT.any, AT.any.optional, AT.any.repeated.optional]);

  expect(() => tryRegister([AT.any.optional, AT.any])).toThrow(
    "A non-optional argument cannot follow an optional one"
  );
  expect(() => tryRegister([AT.any.optional, AT.any.repeated])).toThrow(
    "A non-optional argument cannot follow an optional one"
  );
  expect(() => tryRegister([AT.any.repeated, AT.any.repeated])).toThrow(
    "Repeated arguments are only valid as the final argument"
  );
});
