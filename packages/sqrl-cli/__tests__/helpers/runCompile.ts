/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../helpers/runCli";

export function runCompile(args: string[] = []) {
  return runCli(
    [
      "compile",
      "--output",
      "expr",
      __dirname + "/../../../../examples/hello.sqrl",
      ...args
    ],
    ""
  );
}
