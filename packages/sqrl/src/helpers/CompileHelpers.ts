/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { LocalFilesystem, Filesystem } from "../api/filesystem";
import {
  SqrlParserSourceOptions,
  SqrlParserState
} from "../compile/SqrlParserState";
import { basename, dirname } from "path";
import { parseSqrl } from "../parser/SqrlParse";
import FunctionRegistry from "../function/FunctionRegistry";
import SqrlExecutable from "../execute/SqrlExecutable";
import { compileParserStateAst } from "../compile/SqrlCompile";
import { SqrlCompiledOutput } from "../compile/SqrlCompiledOutput";
import { LabelerSpec } from "../execute/LabelerSpec";
import { JsExecutionContext } from "../execute/JsExecutionContext";
import { StatementAst } from "../ast/Ast";
import invariant from "../jslib/invariant";
import { Context } from "../api/ctx";
import { FeatureMap } from "../api/execute";

export function statementsFromString(source: string): StatementAst[] {
  return parseSqrl(source).statements;
}

export function sourceOptionsFromFilesystem(
  filesystem: Filesystem,
  mainFilename: string
) {
  const sourceBuffer = filesystem.tryRead(mainFilename);
  invariant(sourceBuffer, "Could not read main file source: %s", mainFilename);
  const source = sourceBuffer.toString("utf-8");
  const statements = parseSqrl(source, {
    filename: mainFilename
  }).statements;
  return {
    statements,
    source,
    filesystem
  };
}
export function sourceOptionsFromPath(path: string): SqrlParserSourceOptions {
  return sourceOptionsFromFilesystem(
    new LocalFilesystem(dirname(path)),
    basename(path)
  );
}

export async function executableFromString(
  source: string,
  options: {
    trace?: Context;
    functionRegistry: FunctionRegistry;
    setInputs?: FeatureMap;
    librarySource?: string;
  }
): Promise<SqrlExecutable> {
  let libraryStatements: StatementAst[] = [];
  if (options.librarySource) {
    libraryStatements = [...statementsFromString(options.librarySource)];
  }

  const statements: StatementAst[] = [
    ...libraryStatements,
    ...statementsFromString(source)
  ];
  const parserState = new SqrlParserState({
    statements,
    functionRegistry: options.functionRegistry,
    setInputs: options.setInputs || {}
  });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const spec = await compiledOutput.buildLabelerSpec(options.trace);
  return executableFromSpec(options.functionRegistry, spec);
}

export function executableFromSpec(
  functionRegistry: FunctionRegistry,
  spec: LabelerSpec
) {
  const context = new JsExecutionContext(functionRegistry);
  return new SqrlExecutable(context, spec);
}
