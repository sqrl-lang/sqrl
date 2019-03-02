/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";
import { cmpE, cmpNE, cmpG, cmpGE, cmpL, cmpLE } from "sqrl-common";
import { AstTypes as AT } from "../ast/AstTypes";

export function registerComparisonFunctions(registry: StdlibRegistry) {
  const compareOpts = {
    args: [AT.any, AT.any],
    pure: true,
    argstring: "value, value"
  };
  registry.save(cmpE, {
    ...compareOpts,
    name: "_cmpE",
    docstring:
      "Returns true if the first argument is equal to the second argument"
  });
  registry.save(cmpNE, {
    ...compareOpts,
    name: "_cmpNE",
    docstring:
      "Returns true if the first argument is not equal to the second argument"
  });
  registry.save(cmpG, {
    ...compareOpts,
    name: "_cmpG",
    docstring:
      "Returns true if the first argument is greater than second argument"
  });
  registry.save(cmpGE, {
    ...compareOpts,
    name: "_cmpGE",
    docstring:
      "Returns true if the first argument is greater than or equal to second argument"
  });
  registry.save(cmpL, {
    ...compareOpts,
    name: "_cmpL",
    docstring: "Returns true if the first argument is less than second argument"
  });
  registry.save(cmpLE, {
    ...compareOpts,
    name: "_cmpLE",
    docstring:
      "Returns true if the first argument is less than or equal to second argument"
  });
}
