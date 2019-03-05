/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from "path";
import * as yaml from "js-yaml";
import {
  Instance,
  CompileState,
  CallAst,
  ConstantAst,
  Ast,
  AstBuilder,
  AT,
  sqrlInvariant
} from "sqrl-engine";

function loadFile(state: CompileState, sourceAst: Ast, filePath: string) {
  const pwd = sourceAst.location.filename
    ? path.dirname(sourceAst.location.filename)
    : ".";
  const buffer = state.getFilesystem().tryRead(path.join(pwd, filePath));
  sqrlInvariant(sourceAst, buffer, "Could not find file: %s", filePath);
  return buffer.toString("utf-8");
}

export function register(instance: Instance) {
  instance.registerTransform(
    function loadJson(state: CompileState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return AstBuilder.constant(parsed);
    },
    {
      args: [AT.constant.string],
      argstring: "path",
      docstring: "Loads data from a given JSON file"
    }
  );

  instance.registerTransform(
    function loadYaml(state: CompileState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = yaml.safeLoad(loadFile(state, ast, pathAst.value));
      return AstBuilder.constant(parsed);
    },
    {
      args: [AT.constant.string],
      argstring: "path",
      docstring: "Loads data from a given YAML file"
    }
  );

  // Used by patternMatches
  instance.registerTransform(
    function loadLines(state: CompileState, ast: CallAst): Ast {
      const pathAst = ast.args[0] as ConstantAst;
      const parsed = loadFile(state, pathAst, pathAst.value)
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
      return AstBuilder.constant(parsed);
    },
    {
      args: [AT.constant.string],
      argstring: "path",
      docstring: "Loads data as a list of lines from a given text file"
    }
  );
}
