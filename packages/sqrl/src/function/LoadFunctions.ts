/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { Ast, CallAst, ConstantAst } from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import { StdlibRegistry } from "./FunctionRegistry";
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

export function registerLoadFunctions(registry: StdlibRegistry) {
  registry.save(null, {
    name: "loadJson",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string],
    argstring: "path",
    docstring: "Loads data from a given JSON file"
  });

  registry.save(null, {
    name: "loadYaml",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string],
    argstring: "path",
    docstring: "Loads data from a given YAML file"
  });

  // Used by patternMatches
  registry.save(null, {
    name: "loadLines",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = loadFile(state, pathAst, pathAst.value)
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
      return SqrlAst.constant(parsed);
    },
    args: [AT.constant.string],
    argstring: "path",
    docstring: "Loads data as a list of lines from a given text file"
  });
}
