/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console

import { docopt } from "docopt";
import { cliMain, CliDoc, getCliOutput, CliError } from "./cli/CliMain";
import { promiseFinally } from "sqrl-common";
import { CloseableGroup } from "./jslib/Closeable";
import { FunctionRegistry } from "sqrl";
import { CliOutput } from "./cli/CliOutput";

export function run(registerFunctions?: (registry: FunctionRegistry) => void) {
  const args = docopt(CliDoc, {
    version: 0.1
  });

  const closeables = new CloseableGroup();
  let exitCode = 1;
  let output: CliOutput;

  // Ensure errors inside getCliOutput() get handled neatly.
  try {
    output = getCliOutput(args);
  } catch (err) {
    if (err instanceof CliError) {
      console.error("Error: " + err.message);
      process.exit(1);
    } else {
      throw err;
    }
  }

  promiseFinally(
    cliMain(args, closeables, { registerFunctions, output })
      .then(() => {
        exitCode = 0;
      })
      .catch(err => {
        output.error(err);
      }),
    () => {
      closeables.close();
      process.exit(exitCode);
    }
  );
}
