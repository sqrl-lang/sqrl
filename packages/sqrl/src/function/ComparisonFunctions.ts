/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./Instance";
import { cmpE, cmpNE, cmpG, cmpGE, cmpL, cmpLE } from "sqrl-common";
import { AstTypes as AT } from "../ast/AstTypes";

export function registerComparisonFunctions(instance: StdlibRegistry) {
  const compareOpts = {
    args: [AT.any, AT.any],
    pure: true,
    argstring: "value, value",
  };
  instance.save(cmpE, {
    ...compareOpts,
    name: "_cmpE",
    docstring:
      "Returns true if the first argument is equal to the second argument",
  });
  instance.save(cmpNE, {
    ...compareOpts,
    name: "_cmpNE",
    docstring:
      "Returns true if the first argument is not equal to the second argument",
  });
  instance.save(cmpG, {
    ...compareOpts,
    name: "_cmpG",
    docstring:
      "Returns true if the first argument is greater than second argument",
  });
  instance.save(cmpGE, {
    ...compareOpts,
    name: "_cmpGE",
    docstring:
      "Returns true if the first argument is greater than or equal to second argument",
  });
  instance.save(cmpL, {
    ...compareOpts,
    name: "_cmpL",
    docstring:
      "Returns true if the first argument is less than second argument",
  });
  instance.save(cmpLE, {
    ...compareOpts,
    name: "_cmpLE",
    docstring:
      "Returns true if the first argument is less than or equal to second argument",
  });
}
