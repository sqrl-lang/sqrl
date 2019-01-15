/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  ConstantAst,
  SlotAst,
  Ast,
  CallAst,
  IfAst,
  ListAst,
  FeatureAst
} from "../api/ast";
import { ConstantSlot } from "../api/parse";
import { invariant } from "sqrl-common";

/**
 * Helper class to construct new Ast objects
 */
export class AstBuilder {
  static constant(value: any): ConstantAst {
    return {
      type: "constant",
      value
    };
  }

  static slot(value: ConstantSlot): SlotAst {
    return {
      type: "slot",
      slotName: value._wrapped.name
    };
  }

  static call(functionName: string, args: Ast[]): CallAst {
    return {
      type: "call",
      func: functionName,
      args
    };
  }

  static props(obj: { [key: string]: Ast }): CallAst {
    const args: Ast[] = [];
    Object.entries(obj).forEach(([key, ast]) => {
      args.push(AstBuilder.constant(key), ast);
    });
    return AstBuilder.call("dataObject", args);
  }

  static branch(condition: Ast, trueBranch: Ast, falseBranch: Ast): IfAst {
    return {
      type: "if",
      condition,
      trueBranch,
      falseBranch
    };
  }

  static feature(name: string): FeatureAst {
    return { type: "feature", value: name };
  }

  static and(asts: Ast[]): Ast {
    invariant(
      asts.length > 0,
      "SQRL AstBuilder requires at-least one value for an `and`"
    );
    let result: Ast = AstBuilder.constant(true);
    for (let idx = asts.length - 1; idx >= 0; idx--) {
      const ast: Ast = asts[idx];
      if (ast.type === "constant") {
        if (ast.value) {
          continue;
        } else {
          return AstBuilder.constant(false);
        }
      } else {
        result =
          result.type === "constant" && result.value === true
            ? ast
            : {
                type: "boolean_expr",
                operator: "and",
                left: ast,
                right: result
              };
      }
    }
    return result;
  }

  static or(asts: Ast[]): Ast {
    invariant(
      asts.length > 0,
      "SQRL AstBuilder requires at-least one value for an `or`"
    );
    let result: Ast = AstBuilder.constant(false);
    for (let idx = asts.length - 1; idx >= 0; idx--) {
      const ast: Ast = asts[idx];
      if (ast.type === "constant") {
        if (!ast.value) {
          continue;
        } else {
          return AstBuilder.constant(true);
        }
      } else {
        result =
          result.type === "constant" && result.value === false
            ? ast
            : {
                type: "boolean_expr",
                operator: "or",
                left: ast,
                right: result
              };
      }
    }
    return result;
  }

  static list(asts: Ast[]): ListAst {
    return {
      type: "list",
      exprs: asts
    };
  }
}
