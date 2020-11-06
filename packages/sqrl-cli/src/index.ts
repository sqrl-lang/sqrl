/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console

import { cliMain, getCliOutput } from "./cli/CliMain";
import { promiseFinally } from "sqrl-common";
import { CloseableGroup } from "./jslib/Closeable";
import { Instance } from "sqrl";
import { CliOutput } from "./cli/CliOutput";
import { CliError } from "./cli/CliError";
import { parseArgs, CliArgs } from "./cli/CliArgs";

export { CliArgs };
export { parseArgs };
export { cliMain };

export function run(
  options: {
    register?: (instance: Instance) => Promise<void>;
  } = {}
) {
  const closeables = new CloseableGroup();
  let exitCode = 1;
  let output: CliOutput;

  const args = parseArgs();

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
    cliMain(args, closeables, { register: options.register, output })
      .then(() => {
        exitCode = 0;
      })
      .catch((err) => {
        output.error(err);
      }),
    () => {
      closeables.close();
      process.exit(exitCode);
    }
  );
}
