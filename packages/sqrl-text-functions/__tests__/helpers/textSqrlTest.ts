import { register } from "../../src";
import { buildTestFunctionRegistry, runSqrlTest, Filesystem } from "sqrl";

interface Options {
  filesystem?: Filesystem;
}

export async function runTextSqrlTest(sqrl: string, options: Options) {
  const functionRegistry = await buildTestFunctionRegistry();
  register(functionRegistry);

  return runSqrlTest(sqrl, {
    functionRegistry,
    ...options
  });
}

export function textSqrlTest(
  description: string,
  sqrl: string,
  options: Options = {}
) {
  test(description, () => runTextSqrlTest(sqrl, options));
}
