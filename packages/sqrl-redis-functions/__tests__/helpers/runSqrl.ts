/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
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
    startMs?: number;
  } = {}
) {
  return runLibSqrl(sqrl, {
    functionRegistry:
      options.functionRegistry ||
      (await buildRedisTestFunctionRegistry({
        startMs: options.startMs
      })),
    logger: options.logger
  });
}
