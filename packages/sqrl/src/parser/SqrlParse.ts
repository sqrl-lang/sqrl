/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Ast, ScriptAst, ReplAst, AstLocation } from "../ast/Ast";
import mapObject from "../jslib/mapObject";
import sqrlErrorWrap from "../compile/sqrlErrorWrap";
import sqrl = require("../parser/sqrl");
import { SqrlAstError } from "../api/parse";

interface ParseOptions {
  customFunctions?: Set<string>;
  filename?: string;
  location?: AstLocation;
}

export function parse(
  startRule: string,
  queryText: string,
  options: ParseOptions = {}
): Ast {
  const customFunctions: Set<string> = options.customFunctions || new Set();
  const mergeLocation = (location: sqrl.IFileRange): AstLocation => {
    return (
      options.location ||
      Object.assign({}, location, {
        filename: options.filename || null,
        source: queryText
      })
    );
  };

  try {
    return sqrl.parse(queryText, {
      customFunctions,
      mergeLocation,
      startRule
    });
  } catch (e) {
    if (!(e instanceof sqrl.SyntaxError)) {
      throw e;
    }
    const location = e.location ? mergeLocation(e.location) : null;
    throw new SqrlAstError(e.message, location, queryText);
  }
}

export function parseExpr(text: string, options: ParseOptions = {}): Ast {
  let result: Ast = parse("SqrlExpr", text, options);
  while (result.type === "expr") {
    result = result.expr;
  }
  return result;
}

export function parseRepl(text: string, options = {}): ReplAst {
  const ast = parse("SqrlRepl", text, options);
  if (ast.type !== "repl") {
    throw new Error("Expected repl return type");
  }
  return ast;
}

export function parseSqrl(text: string, options: ParseOptions = {}): ScriptAst {
  const ast = parse("SqrlScript", text, options);
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
