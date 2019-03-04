/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  AT,
  Instance,
  CompileState,
  Execution,
  SqrlEntity,
  SqrlUniqueId,
  CallAst,
  AstBuilder,
  Ast
} from "sqrl";
import { UniqueIdService } from "./services/RedisUniqueId";

async function toEntity(
  service: UniqueIdService,
  state: Execution,
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
  instance: Instance,
  service: UniqueIdService
) {
  instance.register(
    async function _entity(state: Execution, type: string, value) {
      // Handle common empty / null values
      if (value === null || typeof value === "undefined" || value === "") {
        return null;
      }
      return toEntity(service, state, type, value);
    },
    {
      allowNull: true,
      args: [AT.state, AT.constant.string, AT.any]
    }
  );

  instance.register(
    async function _entityList(state: Execution, type: string, arr: string[]) {
      if (type === null || arr === null || !Array.isArray(arr)) {
        return null;
      }
      const entities = await Promise.all(
        arr.map(v => toEntity(service, state, type, v))
      );
      return entities.filter((v?) => v !== null);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.string, AT.any]
    }
  );

  instance.registerTransform(
    function entity(state: CompileState, ast: CallAst): Ast {
      return AstBuilder.call("_entity", ast.args);
    },
    {
      args: [AT.constant.string, AT.any],
      argstring: "type, key",
      docstring: "Create an entity of the given type"
    }
  );

  instance.registerTransform(
    function entityList(state: CompileState, ast: CallAst): Ast {
      return AstBuilder.call("_entityList", ast.args);
    },
    {
      argstring: "type, keys",
      docstring: "Create a list of entities of the given type"
    }
  );
}
