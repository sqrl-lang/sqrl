/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { Ast, CallAst, ConstantAst } from "../ast/Ast";

import { default as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlNode from "../object/SqrlNode";

import bluebird = require("bluebird");
import { SqrlParserState } from "../compile/SqrlParserState";
import { sqrlInvariant } from "../api/parse";
import SqrlUniqueId from "../object/SqrlUniqueId";
import { UniqueIdService } from "../api/UniqueIdService";

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
  registry.save(null, {
    name: "object",
    transformAst(state: SqrlParserState, ast): Ast {
      sqrlInvariant(
        ast,
        ast.args[0].type === "feature" ||
          (ast.args[0].type === "constant" &&
            typeof (ast.args[0] as ConstantAst).value === "string"),
        "object expects a feature / string collection name as the first argument"
      );
      sqrlInvariant(
        ast,
        ast.args.length === 2,
        "Invalid number of arguments passed in to object"
      );
      const objectAst = SqrlAst.call("concat", [
        ast.args[0],
        SqrlAst.constant("/"),
        ast.args[1]
      ]);
      return SqrlAst.call("node", [SqrlAst.constant("Object"), objectAst]);
    }
  });

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
    function uniqueIdNumber(state: SqrlExecutionState, uniqueId: SqrlNode) {
      return uniqueId.getNumberString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlNode]
    }
  );

  registry.save(
    function nodeIdString(state: SqrlExecutionState, node: SqrlNode) {
      return node.nodeId.getIdString();
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlNode]
    }
  );

  registry.save(null, {
    name: "nodeTypeFromIdString",
    args: [AT.any],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("nodeType", [
        SqrlAst.call("nodeFromIdString", ast.args)
      ]);
    }
  });

  registry.save(null, {
    name: "node",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_node", ast.args);
    },
    args: [AT.constant.string, AT.any]
  });

  registry.save(null, {
    name: "nodeList",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      return SqrlAst.call("_nodeList", ast.args);
    }
  });

  registry.save(null, {
    name: "jsonNode",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const [nodeTypeAst, dataAst, pathAst] = ast.args;
      return SqrlAst.call("node", [
        nodeTypeAst,
        SqrlAst.call("jsonValue", [dataAst, pathAst])
      ]);
    },
    args: [AT.any, AT.any, AT.any]
  });
}
