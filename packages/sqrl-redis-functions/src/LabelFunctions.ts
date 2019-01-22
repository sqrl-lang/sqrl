/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import { ensureArray } from "sqrl-common";
import {
  Context,
  Execution,
  FunctionRegistry,
  Manipulator,
  WhenCause,
  SqrlNode,
  AT
} from "sqrl";

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
  registry.registerStatement(
    "SqrlLabelStatements",
    async function addLabel(
      state: Execution,
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
        AT.whenCause,
        AT.any.sqrlNodeOrNodes,
        AT.constant.string
      ],
      allowNull: true,
      allowSqrlObjects: true
    }
  );

  registry.registerStatement(
    "SqrlLabelStatements",
    async function removeLabel(
      state: Execution,
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
        AT.whenCause,
        AT.any.sqrlNodeOrNodes,
        AT.constant.string
      ],
      allowNull: true,
      allowSqrlObjects: true
    }
  );

  registry.register(
    async function hasLabel(state: Execution, node: SqrlNode, label: string) {
      return service.hasLabel(state.ctx, node, label);
    },
    {
      args: [AT.state, AT.any.sqrlNode, AT.constant.string],
      allowSqrlObjects: true
    }
  );
}
