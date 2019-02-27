/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { StdlibRegistry } from "./FunctionRegistry";
import { SqrlParserState } from "../compile/SqrlParserState";
import { CallAst, Ast } from "../ast/Ast";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlAst from "../ast/SqrlAst";

export function registerSourceFunction(registry: StdlibRegistry) {
  registry.save(
    function allSource(state, props = {}) {
      return state.sourcePrinter.getHumanAllSource(props);
    },
    {
      args: [AT.state, AT.any.optional],
      argstring: "",
      docstring: "Returns all of the source code for this execution"
    }
  );

  registry.save(
    function featureSource(state: SqrlExecutionState, featureName, props = {}) {
      const slot = state.getSlot(featureName);
      return state.sourcePrinter.getHumanSlotSource(slot, props);
    },
    {
      args: [AT.state, AT.constant.string, AT.any.optional],
      argstring: "feature",
      docstring: "Returns the source code for the given feature"
    }
  );

  registry.save(
    function _printSource(state: SqrlExecutionState, featureName?: string) {
      const slot = state.getSlot(featureName);
      // tslint:disable-next-line:no-console
      console.log(state.sourcePrinter.getHumanSlotSource(slot));
    },
    {
      args: [AT.state, AT.constant.string.optional],
      statementFeature: "SqrlLogStatements",
      statement: true
    }
  );

  registry.save(
    function printAllSource(state: SqrlExecutionState) {
      state.sourcePrinter.printAllSource();
    },
    {
      args: [],
      statement: true,
      statementFeature: "SqrlLogStatements",
      argstring: "",
      docstring: "Prints the SQRL execution source"
    }
  );

  registry.save(null, {
    name: "printSource",
    args: [AT.feature],
    statement: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const arg = ast.args[0];
      if (arg.type !== "feature") {
        throw new Error("Expected feature arguments");
      }
      return SqrlAst.call("_printSource", [SqrlAst.constant(arg.value)]);
    },
    argstring: "feature",
    docstring: "Prints the SQRL source of the given feature"
  });

  registry.save(null, {
    name: "source",
    args: [AT.feature, AT.any.optional],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const feature = ast.args[0];
      if (feature.type !== "feature") {
        throw new Error("Expected feature argument");
      }
      return SqrlAst.call("featureSource", [
        SqrlAst.constant(feature.value),
        ...ast.args.slice(1)
      ]);
    },
    argstring: "feature",
    docstring: "Returns the source code of the given feature"
  });
}
