/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  AT,
  Ast,
  CallAst,
  ConstantAst,
  CompileState,
  Execution,
  Instance,
  AstBuilder,
} from "sqrl";

export interface PatternService {
  // @todo: We should provide a method to pre-register a pattern as well
  matches(pattern: string, s: string): Promise<string[]>;
}

export function registerPatternFunctions(
  instance: Instance,
  service: PatternService
) {
  instance.registerTransform(
    function patternMatches(state: CompileState, ast: CallAst): Ast {
      const nameAst = ast.args[0] as ConstantAst;
      return AstBuilder.call("_patternMatches", [
        AstBuilder.call("loadLines", [nameAst]),
        ast.args[1],
      ]);
    },
    {
      args: [AT.constant.string, AT.any],
      argstring: "filename, text",
      docstring:
        "Match a list of patterns in the given file against the provided text",
    }
  );

  instance.register(
    async function _patternMatches(
      state: Execution,
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
            service.matches(pattern, candidate).then((matches) => {
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
      args: [AT.state, AT.any, AT.any],
    }
  );
}
