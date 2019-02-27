/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";

import { AstTypes as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlEntity from "../object/SqrlEntity";

import bluebird = require("bluebird");
import { SqrlParserState } from "../compile/SqrlParserState";
import SqrlUniqueId from "../object/SqrlUniqueId";
import { UniqueIdService } from "../api/services";

async function toEntity(
  service: UniqueIdService,
  state: SqrlExecutionState,
  type: string,
  value: string | number,
  options: { expireAtMs?: number } = {}
) {
  if (type === null || value === null) {
    return null;
  }

  if (typeof value === "number") {
    value = value.toString();
  }

  const uniqueId = await service.fetch(state.ctx, type, value);
  return new SqrlEntity(new SqrlUniqueId(uniqueId), type, value);
}

export function registerEntityFunctions(
  registry: StdlibRegistry,
  service: UniqueIdService
) {
  registry.save(
    async function _entity(state: SqrlExecutionState, type: string, value) {
      // Handle common empty / null values
      if (value === null || typeof value === "undefined" || value === "") {
        return null;
      }
      return toEntity(service, state, type, value);
    },
    {
      allowNull: true,
      args: [AT.state, AT.constant.string, AT.any],
      async: true
    }
  );

  registry.save(
    async function _entityList(
      state: SqrlExecutionState,
      type: string,
      arr: string[]
    ) {
      if (type === null || arr === null || !Array.isArray(arr)) {
        return null;
      }
      const entities = await bluebird.map(arr, (v?) =>
        toEntity(service, state, type, v)
      );
      return entities.filter((v?) => v !== null);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.string, AT.any]
    }
  );

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

  registry.save(null, {
    name: "entity",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_entity", ast.args);
    },
    args: [AT.constant.string, AT.any],
    argstring: "type, key",
    docstring: "Create an entity of the given type"
  });

  registry.save(null, {
    name: "entityList",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_entityList", ast.args);
    },
    argstring: "type, keys",
    docstring: "Create a list of entities of the given type"
  });
}
