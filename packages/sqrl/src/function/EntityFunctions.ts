/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./Instance";

import { AstTypes as AT } from "../ast/AstTypes";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlEntity from "../object/SqrlEntity";

export function registerEntityFunctions(instance: StdlibRegistry) {
  instance.save(
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

  instance.save(
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
