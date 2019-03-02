/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../helpers/runCli";
import { examplePath } from "../helpers/examplePath";
import * as stripAnsi from "strip-ansi";

test("works", async () => {
  const stdout = await runCli([
    "run",
    examplePath("hello.sqrl"),
    "-s",
    'Name="Josh"',
    "Text"
  ]);

  expect(stripAnsi(stdout).replace(/[0-9]/g, "x")).toEqual(
    "✓ xxxx-xx-xx xx:xx action was allowed.\n" + 'Text="Hello, Josh!"\n'
  );
});

test("does not work with set after text", async () => {
  // @todo: it would be nice if this worked, but seems like a docopt bug
  await expect(
    (async () => {
      const stdout = await runCli([
        "run",
        examplePath("hello.sqrl"),
        "Text",
        "-s",
        'Name="Josh"'
      ]);

      expect(stripAnsi(stdout).replace(/[0-9]/g, "x")).toEqual(
        "✓ xxxx-xx-xx xx:xx action was allowed.\n" + 'Text="Hello, Josh!"\n'
      );
    })()
  ).rejects.toThrow("Required input was not provided: Name");
});
