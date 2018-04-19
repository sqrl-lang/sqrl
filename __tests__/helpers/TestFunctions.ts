/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "../../src/function/FunctionRegistry";
import { default as AT } from "../../src/ast/AstTypes";
import { SqrlExecutionState } from "../../src/execute/SqrlExecutionState";
import { Manipulator } from "../../src/platform/Manipulator";

export function registerTestFunctions(registry: FunctionRegistry) {
  registry.save(
    function getSqrlOutput(state: SqrlExecutionState) {
      const manipulator: Manipulator = state.manipulator as any;
      return manipulator.getCurrentHumanOutput();
    },
    { args: [AT.state, AT.any], allowNull: true }
  );
}
