import {
  AT,
  CallAst,
  Ast,
  Instance,
  Execution,
  AstBuilder,
  CompileState,
} from "sqrl";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export function registerSourceFunction(instance: Instance) {
  instance.registerSync(
    function allSource(state, props = {}) {
      return state.sourcePrinter.getHumanAllSource(props);
    },
    {
      args: [AT.state, AT.any.optional],
      argstring: "",
      docstring: "Returns all of the source code for this execution",
    }
  );

  instance.registerStatement(
    "SqrlLogStatements",
    async function printAllSource(state: Execution) {
      state.getSourcePrinter().printAllSource();
    },
    {
      args: [AT.state],
      argstring: "",
      docstring: "Prints the SQRL execution source",
    }
  );

  instance.registerSync(
    function _featureSource(state: Execution, featureName, props = {}) {
      return state.getSourcePrinter().getSourceForSlotName(featureName, props);
    },
    {
      args: [AT.state, AT.constant.string, AT.any.optional],
    }
  );

  instance.registerTransform(
    function featureSource(state: CompileState, ast: CallAst): Ast {
      const arg = ast.args[0];
      if (arg.type !== "feature") {
        throw new Error("Expected feature arguments");
      }
      return AstBuilder.call("_featureSource", [
        AstBuilder.constant(arg.value),
      ]);
    },
    {
      args: [AT.feature],
      argstring: "feature",
      docstring: "Returns the JavaScript source of the given feature",
    }
  );

  instance.registerStatement(
    "SqrlLogStatements",
    async function _printSource(state: Execution, featureName?: string) {
      // tslint:disable-next-line:no-console
      console.log(state.getSourcePrinter().getSourceForSlotName(featureName));
    },
    {
      args: [AT.state, AT.constant.string.optional],
    }
  );

  instance.registerTransform(
    function printSource(state: CompileState, ast: CallAst): Ast {
      const arg = ast.args[0];
      if (arg.type !== "feature") {
        throw new Error("Expected feature arguments");
      }
      return AstBuilder.call("_printSource", [AstBuilder.constant(arg.value)]);
    },
    {
      args: [AT.feature],
      argstring: "feature",
      docstring: "Prints the JavaScript source of the given feature",
    }
  );
}
