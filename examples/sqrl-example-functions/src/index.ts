/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AT, Instance, Execution } from "sqrl";

export function register(instance: Instance) {
  instance.register(
    // @todo: Add type for name once it's required
    async function sayHello(state: Execution, name) {
      return "Hello, " + name + "!";
    },
    {
      // @todo: Add argument documentation
      args: [AT.state, AT.any],
    }
  );
}
