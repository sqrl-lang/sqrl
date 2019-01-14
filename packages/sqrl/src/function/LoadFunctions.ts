/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { Ast, CallAst, ConstantAst } from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { SqrlParserState } from "../compile/SqrlParserState";

import * as path from "path";
import * as yaml from "js-yaml";
import { sqrlInvariant } from "../api/parse";

function loadFile(
  parserState: SqrlParserState,
  sourceAst: Ast,
  filePath: string
) {
  const pwd = sourceAst.location.filename
    ? path.dirname(sourceAst.location.filename)
    : ".";
  const buffer = parserState.filesystem.tryRead(path.join(pwd, filePath));
  sqrlInvariant(sourceAst, buffer, "Could not find file: %s", filePath);
  return buffer.toString("utf-8");
}

export function registerLoadFunctions(registry: SqrlFunctionRegistry) {
  registry.save(null, {
    name: "loadJson",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string]
  });

  registry.save(null, {
    name: "loadYaml",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string]
  });

  // Used by patternMatches
  registry.save(null, {
    name: "loadLines",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = loadFile(state, pathAst, pathAst.value)
        .split("\n")
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0);
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string]
  });
}
