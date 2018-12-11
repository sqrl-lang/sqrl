/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlAst from "../ast/SqrlAst";
import { Ast, ScriptAst, ReplAst } from "../ast/Ast";
import mapObject from "../jslib/mapObject";
import sqrlErrorWrap from "../compile/sqrlErrorWrap";

export function parseExpr(text: string): Ast {
  let result: Ast = SqrlAst.parse("SqrlExpr", text);
  while (result.type === "expr") {
    result = result.expr;
  }
  return result;
}

export function parseRepl(text: string, options = {}): ReplAst {
  const ast = SqrlAst.parse("SqrlRepl", text, options);
  if (ast.type !== "repl") {
    throw new Error("Expected repl return type");
  }
  return ast;
}

export function parseSqrl(
  text: string,
  options: { filename?: string } = {}
): ScriptAst {
  const ast = SqrlAst.parse("SqrlScript", text, options);
  if (ast.type !== "script") {
    throw new Error("Expected script return type");
  }
  return ast;
}

export function parseSqrlFiles(files: {
  [filename: string]: string;
}): { [filename: string]: ScriptAst } {
  return sqrlErrorWrap(
    {
      files
    },
    () => {
      const resultAst = mapObject(files, (source: string, filename: string) => {
        return parseSqrl(source, {
          filename
        });
      });

      return resultAst;
    }
  );
}
