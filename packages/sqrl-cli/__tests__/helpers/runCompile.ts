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
