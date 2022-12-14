/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Instance } from "sqrl";
import { CreateRegExp } from "./InProcessPatternService";
import { registerWithEngine } from "./registerWithEngine";
import * as RE2 from "re2";
import { TextFunctionsConfig } from "./TextFunctionsConfig";

export function register(instance: Instance) {
  const config: TextFunctionsConfig =
    instance.getConfig()["sqrl-text-functions"] || {};

  let createRegExp: CreateRegExp;
  if (config.builtinRegExp) {
    createRegExp = (source, flags) => new RegExp(source, flags);
  } else {
    createRegExp = (source, flags) => new RE2(source, flags);
  }

  registerWithEngine(instance, createRegExp);
}
