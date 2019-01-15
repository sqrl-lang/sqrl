/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "../function/FunctionRegistry";
import {
  registerAllFunctions,
  FunctionServices
} from "../function/registerAllFunctions";

export function buildFunctionRegistryForServices(services?: FunctionServices) {
  const registry = new SqrlFunctionRegistry();
  registerAllFunctions(registry, services);
  return registry;
}
