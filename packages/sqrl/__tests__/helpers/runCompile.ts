/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { compileParserStateAst } from "../../src/compile/SqrlCompile";
import { SqrlParserState } from "../../src/compile/SqrlParserState";
import { SqrlInstance } from "../../src/function/Instance";
import { registerAllFunctions } from "../../src/function/registerAllFunctions";
import { SqrlCompiledOutput } from "../../src/compile/SqrlCompiledOutput";
import { statementsFromString } from "../../src/helpers/CompileHelpers";
import { JsExecutionContext } from "../../src/node/JsExecutionContext";
import SqrlExecutable from "../../src/execute/SqrlExecutable";
import { createDefaultContext } from "../../src/helpers/ContextHelpers";
import { FeatureMap } from "../../src/api/execute";
import { SimpleManipulator } from "../../src/simple/SimpleManipulator";

export async function runCompile(sqrl: string) {
  const instance = new SqrlInstance();
  registerAllFunctions(instance);
  const statements = statementsFromString(sqrl);
  const parserState = new SqrlParserState({ instance, statements });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const trace = createDefaultContext();
  const spec = compiledOutput.executableSpec;
  const context = new JsExecutionContext(instance);
  const executable = new SqrlExecutable(context, spec);

  return {
    compiledOutput,
    executable,
    instance,
    trace,
  };
}

export async function runExecutable(
  executable: SqrlExecutable,
  options: {
    inputs?: FeatureMap;
  } = {}
) {
  const trace = createDefaultContext();

  // Start up an execution to make tests easier
  const manipulator = new SimpleManipulator();
  const execution = await executable.startExecution(trace, {
    manipulator,
    inputs: options.inputs || {},
    featureTimeoutMs: 1000,
  });
  return { executable, execution, trace };
}

export async function fetchExecutableFeature(
  executable: SqrlExecutable,
  name: string,
  options: {
    inputs?: FeatureMap;
  }
) {
  const { execution } = await runExecutable(executable, options);
  return execution.fetchBasicByName(name);
}

export async function compileToExecution(sqrl: string) {
  const { executable, trace } = await runCompile(sqrl);

  // Start up an execution to make tests easier
  const manipulator = new SimpleManipulator();
  const execution = await executable.startExecution(trace, {
    manipulator,
    featureTimeoutMs: 1000,
  });
  return { executable, execution, trace };
}
