/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlInstance } from "../../src/function/Instance";
import { AstTypes as AT } from "../../src/ast/AstTypes";
import { SqrlExecutionState } from "../../src/execute/SqrlExecutionState";
import { Manipulator } from "../../src/api/execute";

export function registerTestFunctions(instance: SqrlInstance) {
  instance.save(
    function getSqrlOutput(state: SqrlExecutionState) {
      const manipulator: Manipulator = state.manipulator as any;
      return manipulator.getCurrentHumanOutput();
    },
    { args: [AT.state, AT.any], allowNull: true }
  );
}
