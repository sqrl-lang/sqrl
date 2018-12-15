import {
  runSqrlTest as runLibSqrl,
  buildTestFunctionRegistry,
  FunctionRegistry,
  Logger,
  buildTestServices
} from "sqrl";
import { register } from "../../src";
import { buildServices } from "./services";

export async function buildRedisTestFunctionRegistry(
  options: {
    startMs?: number;
  } = {}
) {
  const functionRegistry = await buildTestFunctionRegistry({
    services: await buildTestServices({
      startMs: options.startMs
    })
  });
  register(functionRegistry, buildServices());
  return functionRegistry;
}

export async function runSqrl(
  sqrl: string,
  options: {
    functionRegistry?: FunctionRegistry;
    logger?: Logger;
  } = {}
) {
  return runLibSqrl(sqrl, {
    functionRegistry:
      options.functionRegistry || (await buildRedisTestFunctionRegistry()),
    logger: options.logger
  });
}
