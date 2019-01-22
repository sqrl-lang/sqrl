/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { Manipulator } from "../api/execute";
import { WhenCause } from "./WhenFunctions";

export interface BlockService {
  block(manipulator: Manipulator, cause: WhenCause | null): void;
  whitelist(manipulator: Manipulator, cause: WhenCause | null): void;
  wasBlocked(manipulator: Manipulator): boolean;
}

export function registerBlockFunctions(
  registry: SqrlFunctionRegistry,
  blockService: BlockService
) {
  registry.save(
    function blockAction(state: SqrlExecutionState, context: WhenCause) {
      blockService.block(state.manipulator, context);
    },
    {
      statement: true,
      args: [AT.state, AT.whenCause],
      allowNull: true,
      statementFeature: "SqrlSaveStatements"
    }
  );

  registry.save(
    function whitelistAction(state: SqrlExecutionState, context: WhenCause) {
      blockService.whitelist(state.manipulator, context);
    },
    {
      statement: true,
      args: [AT.state, AT.whenCause],
      allowNull: true,
      statementFeature: "SqrlSaveStatements"
    }
  );

  registry.save(
    function wasBlocked(state: SqrlExecutionState) {
      blockService.wasBlocked(state.manipulator);
    },
    {
      statement: true,
      args: [AT.state, AT.feature],
      statementFeature: "SqrlSaveStatements"
    }
  );
}
