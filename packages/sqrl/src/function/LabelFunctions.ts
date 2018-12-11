/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { default as AT } from "../ast/AstTypes";
import FunctionRegistry from "./FunctionRegistry";
import { Manipulator } from "../platform/Manipulator";
import SqrlNode from "../object/SqrlNode";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { ensureArray } from "../jslib/ensureArray";
import { WhenCause } from "./WhenFunctions";
import { Context } from "../api/ctx";

export interface LabelService {
  addLabel(
    manipulator: Manipulator,
    node: SqrlNode,
    label: string,
    cause: WhenCause | null
  );
  removeLabel(
    manipulator: Manipulator,
    node: SqrlNode,
    label: string,
    cause: WhenCause | null
  );
  hasLabel(ctx: Context, node: SqrlNode, label: string): Promise<boolean>;
}

export function registerLabelFunctions(
  registry: FunctionRegistry,
  service: LabelService
) {
  registry.save(
    function addLabel(
      state: SqrlExecutionState,
      cause: WhenCause,
      nodes: SqrlNode | SqrlNode[],
      label: string
    ) {
      ensureArray(nodes).forEach(node => {
        if (node !== null) {
          service.addLabel(state.manipulator, node, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenContext,
        AT.any.sqrlNodeOrArray,
        AT.constant.string
      ],
      allowNull: true,
      allowSqrlObjects: true,
      statement: true,
      statementFeature: "SqrlLabelStatements"
    }
  );

  registry.save(
    function removeLabel(
      state: SqrlExecutionState,
      cause: WhenCause,
      nodes: SqrlNode | SqrlNode[],
      label: string
    ) {
      ensureArray(nodes).forEach(node => {
        if (node !== null) {
          service.removeLabel(state.manipulator, node, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenContext,
        AT.any.sqrlNodeOrArray,
        AT.constant.string
      ],
      allowNull: true,
      allowSqrlObjects: true,
      statement: true,
      statementFeature: "SqrlLabelStatements"
    }
  );

  registry.save(
    async function hasLabel(
      state: SqrlExecutionState,
      node: SqrlNode,
      label: string
    ) {
      return service.hasLabel(state.ctx, node, label);
    },
    {
      args: [AT.state, AT.any.sqrlNode, AT.constant.string],
      allowSqrlObjects: true
    }
  );
}
