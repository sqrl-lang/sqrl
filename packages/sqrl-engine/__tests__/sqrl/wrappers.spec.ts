/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as SQRL from "../../src/index";

test("wrappers work", async () => {
  const instance = SQRL.createInstance();

  instance.registerSync(function world() {
    return "world";
  });

  instance.registerTransform(function excl(state, ast) {
    return SQRL.AstBuilder.constant("!");
  });

  const ctx = SQRL.createSimpleContext();
  const executable = await SQRL.executableFromString(
    instance,
    "LET X := concat('Hello ', world(), excl());"
  );

  const execution = await executable.execute(ctx);
  await expect(execution.fetchValue("X")).resolves.toEqual("Hello world!");
});
