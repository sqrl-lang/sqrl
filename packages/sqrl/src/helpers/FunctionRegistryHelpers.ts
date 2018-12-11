/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { buildServicesFromAddresses } from "./ServiceHelpers";
import { registerAllFunctions } from "../function/registerAllFunctions";
import FunctionRegistry from "../function/FunctionRegistry";

export function buildFunctionRegistryFromAddresses(addresses: {
  ratelimitAddress?: string;
  redisAddress?: string;
}) {
  const functionRegistry = new FunctionRegistry();
  const services = buildServicesFromAddresses(addresses);
  registerAllFunctions(functionRegistry, services);
  return functionRegistry;
}
