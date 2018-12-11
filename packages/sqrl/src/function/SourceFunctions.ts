/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { default as AT } from "../ast/AstTypes";
import FunctionRegistry from "./FunctionRegistry";
import { SqrlParserState } from "../compile/SqrlParserState";
import { CallAst, Ast } from "../ast/Ast";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlAst from "../ast/SqrlAst";

export function registerSourceFunction(registry: FunctionRegistry) {
  registry.save(
    function allSource(state, props = {}) {
      return state.sourcePrinter.getHumanAllSource(props);
    },
    {
      args: [AT.state, AT.any.optional]
    }
  );

  registry.save(
    function featureSource(state: SqrlExecutionState, featureName, props = {}) {
      const slot = state.getSlot(featureName);
      return state.sourcePrinter.getHumanSlotSource(slot, props);
    },
    {
      args: [AT.state, AT.constant.string, AT.any.optional]
    }
  );

  registry.save(
    function _printSource(state: SqrlExecutionState, featureName?: string) {
      if (featureName) {
        const slot = state.getSlot(featureName);
        // tslint:disable-next-line:no-console
        console.log(state.sourcePrinter.getHumanSlotSource(slot));
      } else {
        state.sourcePrinter.printAllSource();
      }
    },
    {
      args: [AT.state, AT.constant.string.optional],
      statementFeature: "SqrlLogStatements",
      statement: true
    }
  );

  registry.save(null, {
    name: "printSource",
    args: [AT.feature.optional],
    statement: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const args: Ast[] = ast.args.map(arg => {
        if (arg.type !== "feature") {
          throw new Error("Expected feature arguments");
        }
        return SqrlAst.constant(arg.value);
      });
      return SqrlAst.call("_printSource", args);
    }
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
    }
  });
}
