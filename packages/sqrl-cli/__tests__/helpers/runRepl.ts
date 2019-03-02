import { runCli } from "./runCli";

export async function runRepl(args: string[], code: string) {
  const stdout = await runCli(
    ["repl", "--config", __dirname + "/../fixed-date-config.json", ...args],
    code.trim().replace(/^ */g, "") + "\n"
  );

  return stdout.split(/\n?sqrl> /gm).filter(v => v);
}
