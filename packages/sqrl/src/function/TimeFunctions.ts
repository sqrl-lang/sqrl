/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./Instance";
import { AstTypes as AT } from "../ast/AstTypes";
import bluebird = require("bluebird");

export function registerTimeFunctions(instance: StdlibRegistry) {
  instance.save(
    function now() {
      return new Date().toISOString();
    },
    {
      args: [],
      safe: true,
      argstring: "",
      docstring: "Returns the current time as an ISO 8601 string"
    }
  );

  instance.save(
    function nowMs() {
      return Date.now();
    },
    {
      args: [],
      safe: true,
      argstring: "",
      docstring:
        "Returns the current time as a count of milliseconds since the unix epoch"
    }
  );

  instance.save(
    function delayMs(state, ms, value) {
      return bluebird.delay(ms).thenReturn(value);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any, AT.any],
      async: true,
      argstring: "ms, value",
      docstring:
        "Returns the given value after delaying for the specified number of milliseconds"
    }
  );
}
