/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Executable, Instance, FeatureMap } from "./execute";
import { SqrlExecutable } from "../execute/SqrlExecutable";
import { JsExecutionContext } from "../node/JsExecutionContext";
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
  usedFiles?: string[];
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
 * This method creates an SQRL Executable given an instance and a list
 * of statements.
 */
export async function compileFromStatements(
  instance: Instance,
  statements: StatementAst[],
  options: CompileFromStatementsOptions
): Promise<{
  compiled: CompiledExecutable;
  executable: Executable;
  spec: ExecutableSpec;
}> {
  const parserState = new SqrlParserState({
    statements,
    instance: instance._instance,
    setInputs: options.setInputs || {},
    filesystem: options.filesystem,
    usedFiles: options.usedFiles || [],
  });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const spec = compiledOutput.executableSpec;
  return {
    compiled: new CompiledExecutable(compiledOutput),
    executable: executableFromSpec(instance, spec),
    spec,
  };
}

/**
 * This method creates an SQRL Executable given an instance and a list
 * of statements.
 */
export async function executableFromStatements(
  instance: Instance,
  statements: StatementAst[],
  options: CompileFromStatementsOptions
): Promise<Executable> {
  return (await compileFromStatements(instance, statements, options))
    .executable;
}

interface CompileFromStringOptions extends CompileFromStatementsOptions {
  librarySource?: string;
}

/**
 * This method creates an SQRL Executable given source code and an instance
 */
export async function compileFromString(
  instance: Instance,
  source: string,
  options: CompileFromStringOptions = {}
) {
  let libraryStatements: StatementAst[] = [];
  if (options.librarySource) {
    libraryStatements = [
      ...statementsFromString(options.librarySource, {
        customFunctions: instance._instance.customFunctions,
      }),
    ];
  }
  const statements: StatementAst[] = [
    ...libraryStatements,
    ...statementsFromString(source, {
      customFunctions: instance._instance.customFunctions,
    }),
  ];
  return compileFromStatements(instance, statements, options);
}

/**
 * This method creates an SQRL Executable given source code and an instance
 */
export async function executableFromString(
  instance: Instance,
  source: string,
  options: CompileFromStringOptions = {}
): Promise<Executable> {
  return (await compileFromString(instance, source, options)).executable;
}

interface CompileFromFilesystemOptions extends CompileFromStatementsOptions {
  mainFile?: string;
}

/**
 * This method creates an compiles given a filesystem of source.
 */
export async function compileFromFilesystem(
  instance: Instance,
  filesystem: Filesystem,
  options: CompileFromFilesystemOptions = {}
) {
  const mainFile = options.mainFile || "main.sqrl";
  const sqrlBuffer = filesystem.tryRead(mainFile);
  invariant(sqrlBuffer, "Expected to find main.sqrl in test fs");
  const statements = statementsFromString(sqrlBuffer.toString("utf-8"), {
    customFunctions: instance._instance.customFunctions,
  });
  return compileFromStatements(instance, statements, {
    filesystem,
    usedFiles: [mainFile],
    ...options,
  });
}

/**
 * This method creates an SQRL Executable given source code and an instance
 */
export async function executableFromFilesystem(
  instance: Instance,
  filesystem: Filesystem,
  options: CompileFromFilesystemOptions = {}
): Promise<Executable> {
  return (await compileFromFilesystem(instance, filesystem, options))
    .executable;
}

/**
 * This method creates an SQRL Executable given a previously compiled
 * ExecutableSpec.
 */
export function executableFromSpec(
  instance: Instance,
  spec: ExecutableSpec
): Executable {
  const context = new JsExecutionContext(instance._instance);
  return new Executable(new SqrlExecutable(context, spec));
}
