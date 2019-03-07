/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlInstance } from "../function/Instance";
import { registerAllFunctions } from "../function/registerAllFunctions";
import { FunctionServices } from "../api/execute";

export function buildSqrlInstanceForServices(services: FunctionServices) {
  const instance = new SqrlInstance();
  registerAllFunctions(instance);
  return instance;
}
