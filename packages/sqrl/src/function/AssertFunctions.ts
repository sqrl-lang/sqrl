/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "../function/FunctionRegistry";
import { AstTypes as AT } from "../ast/AstTypes";
import { Ast, CallAst } from "../ast/Ast";

import { AssertService, comparisonSymbols } from "sqrl-common";
import SqrlAst from "../ast/SqrlAst";

import { sqrlInvariant } from "../api/parse";
import { sqrlSourceArrow } from "../compile/sqrlSourceArrow";
import { SqrlParserState } from "../compile/SqrlParserState";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";

export function registerAssertFunctions(
  registry: StdlibRegistry,
  service: AssertService
) {
  registry.save(
    function _assert(state: SqrlExecutionState, value, arrow) {
      service.ok(state.manipulator, value, arrow);
    },
    {
      lazyArguments: true,
      allowNull: true,
      args: [AT.state, AT.any, AT.any],
      statement: true,
      statementFeature: "SqrlAssertionStatements"
    }
  );

  registry.save(
    function _assertCmp(
      state: SqrlExecutionState,
      left: any,
      operator: string,
      right: any,
      arrow: string
    ) {
      service.compare(state.manipulator, left, operator, right, arrow);
    },
    {
      lazyArguments: true,
      allowNull: true,
      args: [AT.state, AT.any, AT.any, AT.any, AT.any],
      statement: true,
      statementFeature: "SqrlAssertionStatements"
    }
  );

  registry.save(null, {
    name: "assert",
    statement: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      sqrlInvariant(ast, ast.args.length === 1, `Expecting a single argument`);
      let sourceArrowAst = SqrlAst.constant("");
      if (ast.location) {
        sourceArrowAst = SqrlAst.constant(
          `line ${ast.location.start.line}\n` + sqrlSourceArrow(ast.location)
        );
      }

      const [testAst] = ast.args;

      if (testAst.type === "binary_expr") {
        if (comparisonSymbols.has(testAst.operator)) {
          return SqrlAst.call("_assertCmp", [
            testAst.left,
            SqrlAst.constant(testAst.operator),
            testAst.right,
            sourceArrowAst
          ]);
        }
      }
      return SqrlAst.call("_assert", [testAst, sourceArrowAst]);
    },
    argstring: "condition",
    docstring: "Assert that an expected condition is true"
  });
}
