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
  SqrlEntity,
  AT
} from "sqrl";

export interface LabelService {
  addLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause | null
  );
  removeLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause | null
  );
  hasLabel(ctx: Context, entity: SqrlEntity, label: string): Promise<boolean>;
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
      entities: SqrlEntity | SqrlEntity[],
      label: string
    ) {
      ensureArray(entities).forEach(entity => {
        if (entity !== null) {
          service.addLabel(state.manipulator, entity, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenCause,
        AT.any.sqrlEntityOrEntities,
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
      entities: SqrlEntity | SqrlEntity[],
      label: string
    ) {
      ensureArray(entities).forEach(entity => {
        if (entity !== null) {
          service.removeLabel(state.manipulator, entity, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenCause,
        AT.any.sqrlEntityOrEntities,
        AT.constant.string
      ],
      allowNull: true,
      allowSqrlObjects: true
    }
  );

  registry.register(
    async function hasLabel(
      state: Execution,
      entity: SqrlEntity,
      label: string
    ) {
      return service.hasLabel(state.ctx, entity, label);
    },
    {
      args: [AT.state, AT.any.sqrlEntity, AT.constant.string],
      allowSqrlObjects: true
    }
  );
}
