/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Instance } from "sqrl";
import { registerWithEngine } from "./registerWithEngine";
import { TextFunctionsConfig } from "./TextFunctionsConfig";

export function register(instance: Instance) {
  const config: TextFunctionsConfig =
    instance.getConfig()["sqrl-text-functions"] || {};

  if (!config.builtinRegExp) {
    throw new Error("Only builtin regexp support is available on web.");
  }
  const createRegExp = (source, flags) => new RegExp(source, flags);
  registerWithEngine(instance, createRegExp);
}
