/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";

import { AstTypes as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlNode from "../object/SqrlNode";

import bluebird = require("bluebird");
import { SqrlParserState } from "../compile/SqrlParserState";
import SqrlUniqueId from "../object/SqrlUniqueId";
import { UniqueIdService } from "../api/services";

async function toNode(
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
  return new SqrlNode(new SqrlUniqueId(uniqueId), type, value);
}

export function registerNodeFunctions(
  registry: SqrlFunctionRegistry,
  service: UniqueIdService
) {
  registry.save(
    async function _node(state: SqrlExecutionState, type: string, value) {
      // Handle common empty / null values
      if (value === null || typeof value === "undefined" || value === "") {
        return null;
      }
      return toNode(service, state, type, value);
    },
    {
      allowNull: true,
      args: [AT.state, AT.constant.string, AT.any],
      async: true
    }
  );

  registry.save(
    async function _nodeList(
      state: SqrlExecutionState,
      type: string,
      arr: string[]
    ) {
      if (type === null || arr === null || !Array.isArray(arr)) {
        return null;
      }
      const nodes = await bluebird.map(arr, (v?) =>
        toNode(service, state, type, v)
      );
      return nodes.filter((v?) => v !== null);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.string, AT.any]
    }
  );

  registry.save(
    function uniqueId(state: SqrlExecutionState, uniqueId: SqrlNode) {
      return uniqueId.getNumberString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlNode],
      argstring: "node",
      docstring: "Returns the unique id of the node as a string"
    }
  );

  registry.save(
    function nodeId(state: SqrlExecutionState, node: SqrlNode) {
      return node.nodeId.getIdString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlNode],
      argstring: "node",
      docstring: "Returns the node id of the node"
    }
  );

  registry.save(null, {
    name: "node",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_node", ast.args);
    },
    args: [AT.constant.string, AT.any],
    argstring: "type, key",
    docstring: "Create a node of the given type"
  });

  registry.save(null, {
    name: "nodeList",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_nodeList", ast.args);
    },
    argstring: "type, keys",
    docstring: "Create a list of nodes of the given type"
  });
}
