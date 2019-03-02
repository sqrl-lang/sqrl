/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";
import { AstTypes as AT } from "../ast/AstTypes";

import invariant from "../jslib/invariant";
import { SqrlParserState } from "../compile/SqrlParserState";
import { sqrlInvariant, buildSqrlError } from "../api/parse";
import SqrlAst from "../ast/SqrlAst";
import { SqrlObject } from "../object/SqrlObject";

export const INPUT_FUNCTION = "input";

export function registerControlFunctions(registry: StdlibRegistry) {
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
    },
    argstring: "condition, true_result, false_result",
    docstring:
      "Returns either the true_result or false_result based on the condition"
  });

  registry.save(
    function ifNull(test, valueIfNull) {
      if (test === null) {
        return valueIfNull;
      } else {
        return test;
      }
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      args: [AT.any, AT.any],
      pure: true,
      argstring: "value, valueIfNull",
      docstring: "Returns the value, or valueIfNull if it is null"
    }
  );

  registry.save(null, {
    name: INPUT_FUNCTION,
    transformAst(state, ast: CallAst) {
      throw new Error(
        "This is a language feature, should not be called in runtime"
      );
    },
    argstring: "",
    docstring: "Sets the given feature as an input value"
  });

  registry.save(function _slotWait() {
    throw new Error("This function is a language builtin");
  });

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
    },
    argstring: "feature[, ...]",
    docstring:
      "Function that returns once all of the input features have been calculated"
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
      args: [AT.state, AT.any, AT.any, AT.any]
    }
  );
}
