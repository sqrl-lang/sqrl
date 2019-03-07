import {
  AT,
  CallAst,
  Ast,
  Instance,
  Execution,
  AstBuilder,
  CompileState
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
      docstring: "Returns all of the source code for this execution"
    }
  );

  instance.registerSync(
    function featureSource(state: Execution, featureName, props = {}) {
      return state.getSourcePrinter().getSourceForSlotName(featureName, props);
    },
    {
      args: [AT.state, AT.constant.string, AT.any.optional],
      argstring: "feature",
      docstring: "Returns the source code for the given feature"
    }
  );

  instance.registerStatement(
    "SqrlLogStatements",
    async function _printSource(state: Execution, featureName?: string) {
      // tslint:disable-next-line:no-console
      console.log(state.getSourcePrinter().getSourceForSlotName(featureName));
    },
    {
      args: [AT.state, AT.constant.string.optional]
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
      docstring: "Prints the SQRL execution source"
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
      docstring: "Prints the SQRL source of the given feature"
    }
  );

  instance.registerTransform(
    function source(state: CompileState, ast: CallAst): Ast {
      const feature = ast.args[0];
      if (feature.type !== "feature") {
        throw new Error("Expected feature argument");
      }
      return AstBuilder.call("featureSource", [
        AstBuilder.constant(feature.value),
        ...ast.args.slice(1)
      ]);
    },
    {
      args: [AT.feature, AT.any.optional],

      argstring: "feature",
      docstring: "Returns the source code of the given feature"
    }
  );
}
