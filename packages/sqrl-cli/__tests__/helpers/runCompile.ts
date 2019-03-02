import { runCli } from "../helpers/runCli";
import { defaultCliArgs, CliArgs } from "../../src/cli/CliMain";

export function runCompile(args: Partial<CliArgs> = {}) {
  return runCli(
    {
      ...defaultCliArgs,
      compile: true,
      "--output": "expr",
      "<filename>": __dirname + "/../../../../examples/hello.sqrl",
      ...args
    },
    ""
  );
}
