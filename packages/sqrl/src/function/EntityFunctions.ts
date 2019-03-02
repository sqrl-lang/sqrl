/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";

import { AstTypes as AT } from "../ast/AstTypes";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlEntity from "../object/SqrlEntity";

export function registerEntityFunctions(registry: StdlibRegistry) {
  registry.save(
    function uniqueId(state: SqrlExecutionState, uniqueId: SqrlEntity) {
      return uniqueId.getNumberString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlEntity],
      argstring: "entity",
      docstring: "Returns the unique id of the entity as a string"
    }
  );

  registry.save(
    function entityId(state: SqrlExecutionState, entity: SqrlEntity) {
      return entity.entityId.getIdString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlEntity],
      argstring: "entity",
      docstring: "Returns the entity id of the entity"
    }
  );
}
