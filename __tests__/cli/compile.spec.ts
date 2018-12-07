import { runCli } from "../helpers/runCli";
import { defaultCliArgs } from "../../src/cli/CliMain";

test("repl works", async () => {
  const output = await runCli(
    {
      ...defaultCliArgs,
      compile: true,
      "--output": "expr",
      "<filename>": __dirname + "/../../samples/hello.sqrl"
    },
    ""
  );

  expect(JSON.parse(output)).toMatchSnapshot();
});
