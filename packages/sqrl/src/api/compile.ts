import { Executable, FunctionRegistry, FeatureMap } from "./execute";
import { SqrlExecutable } from "../execute/SqrlExecutable";
import { JsExecutionContext } from "../execute/JsExecutionContext";
import { ExecutableSpec } from "./spec";
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
export class ExecutableCompiler {
  constructor(
    /**
     * @internal
     */
    public _wrapped: SqrlCompiledOutput
  ) {}

  buildExprs(ctx: Context) {
    return this._wrapped.fetchBuildOutput(ctx);
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
  compiler: ExecutableCompiler;
  executable: Executable;
  spec: ExecutableSpec;
}> {
  const parserState = new SqrlParserState({
    statements,
    functionRegistry: functionRegistry._wrapped,
    setInputs: options.setInputs || {},
    filesystem: options.filesystem
  });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const spec = await compiledOutput.buildLabelerSpec(options.context);
  return {
    compiler: new ExecutableCompiler(compiledOutput),
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
    libraryStatements = [...statementsFromString(options.librarySource)];
  }
  const statements: StatementAst[] = [
    ...libraryStatements,
    ...statementsFromString(source)
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
  const statements = statementsFromString(sqrlBuffer.toString("utf-8"));
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
  const context = new JsExecutionContext(functionRegistry._wrapped);
  return new Executable(new SqrlExecutable(context, spec));
}
