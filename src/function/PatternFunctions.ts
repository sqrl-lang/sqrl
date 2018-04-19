/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Ast, CallAst, ConstantAst } from "../ast/Ast";
import { default as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import FunctionRegistry from "./FunctionRegistry";
import { SqrlParserState } from "../compile/SqrlParserState";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";

export interface PatternService {
  // @todo: We should provide a method to pre-register a pattern as well
  matches(pattern: string, s: string): Promise<string[]>;
}

export function registerPatternFunctions(
  registry: FunctionRegistry,
  service: PatternService
) {
  registry.save(null, {
    name: "patternMatches",
    args: [AT.constant.string, AT.any],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const nameAst = ast.args[0] as ConstantAst;
      return SqrlAst.call("_patternMatches", [
        SqrlAst.call("loadLines", [nameAst]),
        ast.args[1]
      ]);
    }
  });

  registry.save(
    async function _patternMatches(
      state: SqrlExecutionState,
      patterns: string[],
      candidates: string | string[] | null
    ) {
      if (!candidates) {
        return [];
      }

      if (!Array.isArray(candidates)) {
        candidates = [candidates];
      }

      const rv = [];
      const promises = [];
      for (const pattern of patterns) {
        for (const candidate of candidates) {
          promises.push(
            service.matches(pattern, candidate).then(matches => {
              rv.push(...matches);
            })
          );
        }
      }

      await Promise.all(promises);
      return rv;
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      stateArg: true
    }
  );
}
