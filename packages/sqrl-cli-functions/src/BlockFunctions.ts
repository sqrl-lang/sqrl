import { WhenCause, AT, Instance, Execution } from "sqrl";
import { CliManipulator } from "./CliManipulator";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export function registerBlockFunctions(instance: Instance) {
  instance.registerStatement(
    "SqrlBlockStatements",
    async function blockAction(state: Execution, cause: WhenCause) {
      if (!(state.manipulator instanceof CliManipulator)) {
        throw new Error("Expected CliManipulator for SimpleBlockService");
      }
      state.manipulator.setBlocked(cause);
    },
    {
      args: [AT.state, AT.whenCause],
      allowNull: true,
      argstring: "",
      docstring: "Mark the current action as blocked"
    }
  );

  instance.registerStatement(
    "SqrlBlockStatements",
    async function whitelistAction(state: Execution, cause: WhenCause) {
      if (!(state.manipulator instanceof CliManipulator)) {
        throw new Error("Expected CliManipulator for SimpleBlockService");
      }
      state.manipulator.setWhitelisted(cause);
    },
    {
      args: [AT.state, AT.whenCause],
      allowNull: true,
      argstring: "",
      docstring: "Mark the current action as whitelisted"
    }
  );

  instance.registerSync(
    function wasBlocked(state: Execution) {
      if (!(state.manipulator instanceof CliManipulator)) {
        throw new Error("Expected CliManipulator for SimpleBlockService");
      }
      return state.manipulator.wasBlocked();
    },
    {
      args: [AT.state, AT.feature],
      argstring: "",
      docstring: "Check if the current action was marked as blocked"
    }
  );
}
