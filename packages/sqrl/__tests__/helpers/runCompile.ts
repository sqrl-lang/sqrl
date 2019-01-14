/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { compileParserStateAst } from "../../src/compile/SqrlCompile";
import { SqrlParserState } from "../../src/compile/SqrlParserState";
import { SqrlFunctionRegistry } from "../../src/function/FunctionRegistry";
import { registerAllFunctions } from "../../src/function/registerAllFunctions";
import { SqrlCompiledOutput } from "../../src/compile/SqrlCompiledOutput";
import { statementsFromString } from "../../src/helpers/CompileHelpers";
import { JsExecutionContext } from "../../src/execute/JsExecutionContext";
import SqrlExecutable from "../../src/execute/SqrlExecutable";
import { createDefaultContext } from "../../src/helpers/ContextHelpers";
import { Filesystem } from "../../src/api/filesystem";
import { FeatureMap } from "../../src/api/execute";
import { SimpleManipulator } from "../../src/simple/SimpleManipulator";

export class VirtualSourceTree extends Filesystem {
  constructor(
    private source: {
      [path: string]: string;
    }
  ) {
    super();
  }

  tryList(folder: string) {
    // Return null if the path pointed to a file
    if (this.source[folder]) {
      return null;
    }
    return Object.keys(this.source)
      .filter(path => path.startsWith(folder + "/"))
      .map(path => path.substring((folder + "/").length));
  }
  tryRead(path: string) {
    if (this.source[path]) {
      return Buffer.from(this.source[path]);
    }
    return null;
  }
  tryResolve(path: string) {
    return path;
  }
}

export async function runCompile(sqrl: string) {
  const functionRegistry = new SqrlFunctionRegistry();
  registerAllFunctions(functionRegistry);
  const statements = statementsFromString(sqrl);
  const parserState = new SqrlParserState({ functionRegistry, statements });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const trace = createDefaultContext();
  const spec = await compiledOutput.buildLabelerSpec(trace);
  const context = new JsExecutionContext(functionRegistry);
  const executable = new SqrlExecutable(context, spec);

  return {
    compiledOutput,
    executable,
    functionRegistry,
    trace
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
    featureTimeoutMs: 1000
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
    featureTimeoutMs: 1000
  });
  return { executable, execution, trace };
}
