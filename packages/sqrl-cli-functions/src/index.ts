/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Instance,
  CompileState,
  CallAst,
  AstBuilder,
  AT,
  Execution
} from "sqrl-engine";
import * as util from "util";
import { CliManipulator } from "./CliManipulator";
import { registerSourceFunction } from "./SourceFunctions";
import { registerBlockFunctions } from "./BlockFunctions";
export { CliManipulator } from "./CliManipulator";

export function register(instance: Instance) {
  registerSourceFunction(instance);
  registerBlockFunctions(instance);

  instance.registerStatement(
    "SqrlLogStatements",
    async function log(state: Execution, format: string, ...args) {
      const message = util.format(format, ...args);
      if (!(state.manipulator instanceof CliManipulator)) {
        throw new Error("Expected CliManipulator");
      }
      state.manipulator.log(message);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.string, AT.any.repeated],
      argstring: "format string, value...",
      docstring: "Logs a message using sprintf style formatting"
    }
  );

  instance.registerStatement(
    "SqrlLogStatements",
    async function _logFeature(state: Execution, name: string, value: any) {
      if (!(state.manipulator instanceof CliManipulator)) {
        throw new Error("Expected CliManipulator");
      }
      state.manipulator.logFeature(name, value);
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      args: [AT.state, AT.constant.string, AT.any]
    }
  );

  instance.registerTransform(
    function logFeature(state: CompileState, ast: CallAst) {
      const [feature] = ast.args;
      if (feature.type !== "feature") {
        throw new Error("expected feature argument");
      }
      return AstBuilder.call("_logFeature", [
        AstBuilder.constant(feature.value),
        feature
      ]);
    },
    {
      args: [AT.feature],
      argstring: "feature",
      docstring: "Logs the given feature and its value"
    }
  );
}
