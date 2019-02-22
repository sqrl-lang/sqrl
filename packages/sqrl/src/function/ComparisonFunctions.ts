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
  registry.save(cmpE, {
    ...compareOpts,
    docstring:
      "Returns true if the first argument is equal to the second argument"
  });
  registry.save(cmpNE, {
    ...compareOpts,
    docstring:
      "Returns true if the first argument is not equal to the second argument"
  });
  registry.save(cmpG, {
    ...compareOpts,
    docstring:
      "Returns true if the first argument is greater than second argument"
  });
  registry.save(cmpGE, {
    ...compareOpts,
    docstring:
      "Returns true if the first argument is greater than or equal to second argument"
  });
  registry.save(cmpL, {
    ...compareOpts,
    docstring: "Returns true if the first argument is less than second argument"
  });
  registry.save(cmpLE, {
    ...compareOpts,
    docstring:
      "Returns true if the first argument is less than or equal to second argument"
  });
}
