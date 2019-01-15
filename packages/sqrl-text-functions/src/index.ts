/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as SQRL from "sqrl";
import { registerPatternFunctions } from "./PatternFunctions";
import { InProcessPatternService } from "./InProcessPatternService";

export function register(registry: SQRL.FunctionRegistry) {
  registry.registerSync(function simhash(text: string) {
    return "00000000";
  });

  registerPatternFunctions(registry, new InProcessPatternService());
}
