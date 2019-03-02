import { defaultCliArgs, CliArgs } from "../../src/cli/CliMain";
import { runCli } from "./runCli";

export async function runRepl(args: Partial<CliArgs>, code: string) {
  const stdout = await runCli(
    {
      ...defaultCliArgs,
      repl: true,
      "--config": __dirname + "/../fixed-date-config.json",
      ...args
    },
    code.trim().replace(/^ */g, "") + "\n"
  );

  return stdout.split(/\n?sqrl> /gm).filter(v => v);
}
