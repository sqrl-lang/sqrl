/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { cmpE, cmpNE, cmpG, cmpGE, cmpL, cmpLE } from "sqrl-common";

export function registerComparisonFunctions(registry: SqrlFunctionRegistry) {
  const compareOpts = {
    argCount: 2,
    pure: true
  };
  registry.save(cmpE, compareOpts);
  registry.save(cmpNE, compareOpts);
  registry.save(cmpG, compareOpts);
  registry.save(cmpGE, compareOpts);
  registry.save(cmpL, compareOpts);
  registry.save(cmpLE, compareOpts);
}
