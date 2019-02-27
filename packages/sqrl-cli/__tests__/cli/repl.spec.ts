/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../helpers/runCli";
import { defaultCliArgs } from "../../src/cli/CliMain";

test("repl works", async () => {
  const stdout = await runCli(
    {
      ...defaultCliArgs,
      repl: true
    },
    `
    LET X := 5;
    LET Y := X + 3;
    LET Ip := entity('Ip', '1.2.3.4');
    LET Session := sessionize(BY Ip MAX 3 EVERY HOUR); LET Count := count(BY Session LAST HOUR);
    `
      .trim()
      .replace(/^ */g, "") + "\n"
  );

  expect(stdout).toEqual("sqrl> 5\nsqrl> 8\nsqrl> '1.2.3.4'\nsqrl> 1\nsqrl> ");
});
