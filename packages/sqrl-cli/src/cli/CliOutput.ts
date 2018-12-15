/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console

import { SimpleManipulator } from "sqrl/lib/simple/SimpleManipulator";
import jsonStableStringify = require("fast-stable-stringify");
import { Writable } from "stream";
import {
  serializeExpr,
  FeatureMap,
  Execution,
  ExecutableCompiler,
  ExecutableSpec,
  createSimpleContext
} from "sqrl";

export interface CliOutputOptions {
  stdout?: Writable;
  onlyBlocked?: boolean;
}

export abstract class CliOutput {
  constructor(protected stdout: Writable) {}
  close() {
    return;
  }
  compileError(err: Error) {
    console.error("Compile failed: " + err.toString());
  }
  sourceRecompiling() {
    return;
  }
  sourceUpdated() {
    console.error("Source updated.");
  }
  sourceRecompileError(err: Error) {
    console.error("Source recompile failed: " + err.toString());
  }
}

export abstract class CliCompileOutput extends CliOutput {
  abstract compiled(
    spec: ExecutableSpec,
    compiledOutput: ExecutableCompiler
  ): Promise<void>;
}

export class CliExprOutput extends CliCompileOutput {
  async compiled(spec: ExecutableSpec, compiledOutput: ExecutableCompiler) {
    const { slotNames, slotExprs } = await compiledOutput.buildExprs(
      createSimpleContext()
    );
    this.stdout.write(
      jsonStableStringify({
        slotExprs: slotExprs.map(expr => serializeExpr(expr)),
        slotNames
      }) + "\n"
    );
  }
}

export class CliSlotJsOutput extends CliCompileOutput {
  async compiled(spec: ExecutableSpec, compiledOutput: ExecutableCompiler) {
    console.log(jsonStableStringify(spec));
  }
}

export abstract class CliActionOutput extends CliOutput {
  abstract startStream();
  abstract action(
    manipulator: SimpleManipulator,
    execution: Execution,
    loggedFeatures: FeatureMap
  );
}

export class CliJsonOutput extends CliActionOutput {
  constructor(private options: CliOutputOptions) {
    super(options.stdout);
  }
  startStream() {
    /* do nothing */
  }
  action(
    manipulator: SimpleManipulator,
    execution: Execution,
    loggedFeatures: FeatureMap
  ) {
    if (this.options.onlyBlocked) {
      if (manipulator.wasBlocked()) {
        return;
      }
    }
    console.log(JSON.stringify(loggedFeatures));
  }
}

export class CliCsvOutput extends CliActionOutput {
  constructor(private options: CliOutputOptions) {
    super(options.stdout || process.stdout);
  }
  startStream() {
    /* perhaps write out the headers */
  }
  action(
    manipulator: SimpleManipulator,
    execution: Execution,
    loggedFeatures: FeatureMap
  ) {
    if (this.options.onlyBlocked) {
      if (manipulator.wasBlocked()) {
        return;
      }
    }
    throw new Error("CSV output is not implemented yet.");
  }
}
