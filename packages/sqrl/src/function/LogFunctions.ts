/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import * as util from "util";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { SqrlParserState } from "../compile/SqrlParserState";
import SqrlAst from "../ast/SqrlAst";
import { CallAst } from "../ast/Ast";
import { AstTypes as AT } from "../ast/AstTypes";
import { Manipulator } from "../api/execute";

export interface LogService {
  log(manipulator: Manipulator, message: string);
  logFeature(manipulator: Manipulator, name: string, value: any);
}

export function registerLogFunctions(
  registry: SqrlFunctionRegistry,
  service: LogService = null
) {
  registry.save(
    function log(state: SqrlExecutionState, format: string, ...args) {
      const message = util.format(format, ...args);
      if (service) {
        service.log(state.manipulator, message);
      } else {
        state.info({}, "[from sqrl] %s", message);
      }
    },
    {
      allowNull: true,
      statement: true,
      statementFeature: "SqrlLogStatements",
      stateArg: true,
      argstring: "format string, value...",
      docstring: "Logs a message using sprintf style formatting"
    }
  );

  registry.save(
    function _logFeature(state: SqrlExecutionState, name: string, value: any) {
      if (service) {
        service.logFeature(state.manipulator, name, value);
      } else {
        state.info({}, "[from sqrl]  %s=%s", name, JSON.stringify(value));
      }
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      statement: true,
      statementFeature: "SqrlLogStatements",
      args: [AT.state, AT.constant.string, AT.any]
    }
  );

  registry.save(null, {
    name: "logFeature",
    transformAst(state: SqrlParserState, ast: CallAst) {
      const [feature] = ast.args;
      if (feature.type !== "feature") {
        throw new Error("expected feature argument");
      }
      return SqrlAst.call("_logFeature", [
        SqrlAst.constant(feature.value),
        feature
      ]);
    },
    args: [AT.feature],
    allowNull: true,
    statement: true,
    argstring: "feature",
    docstring: "Logs the given feature and its value"
  });
}
