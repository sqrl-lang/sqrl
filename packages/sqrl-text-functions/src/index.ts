/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as SQRL from "sqrl";
import { registerPatternFunctions } from "./PatternFunctions";
import { InProcessPatternService } from "./InProcessPatternService";
import { SimHash } from "simhash-js";

export function register(registry: SQRL.FunctionRegistry) {
  const jsSimhash = new SimHash();
  registry.registerSync(function simhash(text: string) {
    const hashHex: string = jsSimhash.hash(text).toString(16);
    return hashHex.padStart(8, "0");
  });

  registerPatternFunctions(registry, new InProcessPatternService());
}
