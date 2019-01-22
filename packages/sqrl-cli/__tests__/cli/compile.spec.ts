/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../helpers/runCli";
import { defaultCliArgs } from "../../src/cli/CliMain";

test("repl works", async () => {
  const output = await runCli(
    {
      ...defaultCliArgs,
      compile: true,
      "--output": "expr",
      "<filename>": __dirname + "/../../../../examples/hello.sqrl"
    },
    ""
  );

  expect(JSON.parse(output)).toMatchSnapshot();
});
