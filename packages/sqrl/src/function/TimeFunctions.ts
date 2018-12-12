/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";
import { default as AT } from "../ast/AstTypes";
import bluebird = require("bluebird");

export function registerTimeFunctions(registry: FunctionRegistry) {
  registry.save(
    function now() {
      return new Date().toISOString();
    },
    {
      argCount: 0,
      safe: true
    }
  );

  registry.save(
    function nowMs() {
      return Date.now();
    },
    {
      argCount: 0,
      safe: true
    }
  );

  registry.save(
    function delayMs(state, ms, value) {
      return bluebird.delay(ms).thenReturn(value);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any, AT.any],
      async: true
    }
  );
}
