/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";

import invariant from "../jslib/invariant";
import { SqrlParserState } from "../compile/SqrlParserState";
import { sqrlInvariant } from "../api/parse";
import SqrlAst from "../ast/SqrlAst";
import { buildSqrlError } from "../api/parse";
import SqrlObject from "../object/SqrlObject";

export const LABELER_FEATURE_FUNCTION = "input";

export function registerStdlibFunctions(registry: FunctionRegistry) {
  registry.save(function functionList() {
    return Object.keys(registry.functionProperties).filter(
      func => !func.startsWith("_")
    );
  });

  registry.save(null, {
    name: "if",
    allowNull: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      sqrlInvariant(
        ast,
        ast.args.length === 2 || ast.args.length === 3,
        "if() requires a condition, value and optional else value"
      );

      const elseValue = ast.args[2] || SqrlAst.constant(null);
      return SqrlAst.branch(ast.args[0], ast.args[1], elseValue);
    }
  });

  registry.save(null, {
    name: LABELER_FEATURE_FUNCTION,
    transformAst(state, ast: CallAst) {
      throw new Error(
        "This is a language feature, should not be called in runtime"
      );
    }
  });

  registry.save(function _slotWait() {
    throw new Error("This function is a language builtin");
  });

  registry.save(
    function noop() {
      /* do nothing */
    },
    {
      statement: true,
      statementFeature: "SqrlNoopStatements"
    }
  );

  registry.save(null, {
    name: "wait",
    transformAst(state, ast: CallAst): CallAst {
      return SqrlAst.call(
        "_slotWait",
        ast.args.map(arg => {
          if (arg.type !== "feature") {
            throw buildSqrlError(arg, "wait only allows features as arguments");
          }
          return SqrlAst.slotName(arg.value);
        })
      );
    }
  });

  registry.save(
    async function _listComprehension(
      state,
      iterator,
      outputFn,
      whereFn,
      values
    ) {
      if (values === null) {
        return null;
      }
      invariant(
        Array.isArray(values),
        "Invalid values for list comprehension."
      );

      let promise;
      if (whereFn === true) {
        promise = Promise.all(values.map(value => outputFn.call(state, value)));
      } else {
        promise = Promise.all(
          values.map(value => {
            return whereFn.call(state, value).then(filterResult => {
              return SqrlObject.isTruthy(filterResult)
                ? outputFn.call(state, value)
                : null;
            });
          })
        );
      }

      const rv = await promise;
      return rv.filter(v => v !== null);
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      argCount: 4,
      stateArg: true
    }
  );
}
