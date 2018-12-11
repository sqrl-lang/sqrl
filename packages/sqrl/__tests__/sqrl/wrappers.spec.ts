/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as SQRL from "../../src/index";

test("wrappers work", async () => {
  const functionRegistry = SQRL.buildFunctionRegistry();

  functionRegistry.registerSync(function world() {
    return "world";
  });

  functionRegistry.registerTransform(function excl(state, ast) {
    return SQRL.AstBuilder.constant("!");
  });

  const ctx = SQRL.createSimpleContext();
  const executable = await SQRL.executableFromString(
    "LET X := concat('Hello ', world(), excl());",
    {
      functionRegistry
    }
  );

  const execution = await executable.execute(ctx);
  await expect(execution.fetchFeature("X")).resolves.toEqual("Hello world!");
});
