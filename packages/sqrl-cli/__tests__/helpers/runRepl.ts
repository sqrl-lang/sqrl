/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "./runCli";

export async function runRepl(args: string[], code: string) {
  const stdout = await runCli(
    ["repl", "--config", __dirname + "/../fixed-date-config.json", ...args],
    code.trim().replace(/^ */g, "") + "\n"
  );

  return stdout.split(/\n?sqrl> /gm).filter(v => v);
}
