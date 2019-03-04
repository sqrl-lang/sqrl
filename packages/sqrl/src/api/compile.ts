/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Executable, FunctionRegistry, FeatureMap } from "./execute";
import { SqrlExecutable } from "../execute/SqrlExecutable";
import { JsExecutionContext } from "../execute/JsExecutionContext";
import { ExecutableSpec, FeatureDocMap, RuleSpecMap } from "./spec";
import { Context } from "./ctx";
import { SqrlCompiledOutput } from "../compile/SqrlCompiledOutput";
import { StatementAst } from "./ast";
import { statementsFromString } from "../helpers/CompileHelpers";
import { SqrlParserState } from "../compile/SqrlParserState";
import { compileParserStateAst } from "../compile/SqrlCompile";
import { Filesystem } from "./filesystem";
import { invariant } from "sqrl-common";

interface CompileFromStatementsOptions {
  context?: Context;
  filesystem?: Filesystem;
  setInputs?: FeatureMap;
}

/**
 * A SQRL Executable Compiler is the partial representation of a compiled
 * execution
 */
export class CompiledExecutable {
  constructor(
    /**
     * @internal
     */
    public _wrapped: SqrlCompiledOutput
  ) {}

  getSlotLoad(): number[][] {
    return this._wrapped.slotLoad;
  }
  getSlotNames(): string[] {
    return this._wrapped.slotNames;
  }
  getSlotExprs() {
    return this._wrapped.slotExprs;
  }
  getUsedFunctions(ctx: Context): string[] {
    return this._wrapped.usedFunctions;
  }
  getExecutableSpec(): ExecutableSpec {
    return this._wrapped.executableSpec;
  }
  getFeatureDocs(): FeatureDocMap {
    return this._wrapped.featureDocs;
  }
  getRuleSpecs(): RuleSpecMap {
    return this._wrapped.ruleSpecs;
  }
}

/**
 * This method creates an SQRL Executable given a function registry and a list
 * of statements.
 */
export async function compileFromStatements(
  functionRegistry: FunctionRegistry,
  statements: StatementAst[],
  options: CompileFromStatementsOptions
): Promise<{
  compiled: CompiledExecutable;
  executable: Executable;
  spec: ExecutableSpec;
}> {
  const parserState = new SqrlParserState({
    statements,
    functionRegistry: functionRegistry._functionRegistry,
    setInputs: options.setInputs || {},
    filesystem: options.filesystem
  });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const spec = compiledOutput.executableSpec;
  return {
    compiled: new CompiledExecutable(compiledOutput),
    executable: executableFromSpec(functionRegistry, spec),
    spec
  };
}

/**
 * This method creates an SQRL Executable given a function registry and a list
 * of statements.
 */
export async function executableFromStatements(
  functionRegistry: FunctionRegistry,
  statements: StatementAst[],
  options: CompileFromStatementsOptions
): Promise<Executable> {
  return (await compileFromStatements(functionRegistry, statements, options))
    .executable;
}

interface CompileFromStringOptions extends CompileFromStatementsOptions {
  librarySource?: string;
}

/**
 * This method creates an SQRL Executable given source code and a function
 * registry.
 */
export async function compileFromString(
  functionRegistry: FunctionRegistry,
  source: string,
  options: CompileFromStringOptions = {}
) {
  let libraryStatements: StatementAst[] = [];
  if (options.librarySource) {
    libraryStatements = [
      ...statementsFromString(options.librarySource, {
        customFunctions: functionRegistry._functionRegistry.customFunctions
      })
    ];
  }
  const statements: StatementAst[] = [
    ...libraryStatements,
    ...statementsFromString(source, {
      customFunctions: functionRegistry._functionRegistry.customFunctions
    })
  ];
  return compileFromStatements(functionRegistry, statements, options);
}

/**
 * This method creates an SQRL Executable given source code and a function
 * registry.
 */
export async function executableFromString(
  functionRegistry: FunctionRegistry,
  source: string,
  options: CompileFromStringOptions = {}
): Promise<Executable> {
  return (await compileFromString(functionRegistry, source, options))
    .executable;
}

interface CompileFromFilesystemOptions extends CompileFromStatementsOptions {
  mainFile?: string;
}

/**
 * This method creates an compiles given a filesystem of source.
 */
export async function compileFromFilesystem(
  functionRegistry: FunctionRegistry,
  filesystem: Filesystem,
  options: CompileFromFilesystemOptions = {}
) {
  const mainFile = options.mainFile || "main.sqrl";
  const sqrlBuffer = filesystem.tryRead(mainFile);
  invariant(sqrlBuffer, "Expected to find main.sqrl in test fs");
  const statements = statementsFromString(sqrlBuffer.toString("utf-8"), {
    customFunctions: functionRegistry._functionRegistry.customFunctions
  });
  return compileFromStatements(functionRegistry, statements, {
    filesystem,
    ...options
  });
}

/**
 * This method creates an SQRL Executable given source code and a function
 * registry.
 */
export async function executableFromFilesystem(
  functionRegistry: FunctionRegistry,
  filesystem: Filesystem,
  options: CompileFromFilesystemOptions = {}
): Promise<Executable> {
  return (await compileFromFilesystem(functionRegistry, filesystem, options))
    .executable;
}

/**
 * This method creates an SQRL Executable given a previously compiled
 * ExecutableSpec.
 */
export function executableFromSpec(
  functionRegistry: FunctionRegistry,
  spec: ExecutableSpec
): Executable {
  const context = new JsExecutionContext(functionRegistry._functionRegistry);
  return new Executable(new SqrlExecutable(context, spec));
}
