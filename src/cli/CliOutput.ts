/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console

import { SimpleManipulator } from "../simple/SimpleManipulator";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { FeatureMap } from "../feature/FeatureTypes";
import { SqrlCompiledOutput } from "../compile/SqrlCompiledOutput";
import { LabelerSpec } from "../execute/LabelerSpec";
import { jsonStableStringify } from "../jslib/jsonStableStringify";
import { serializeExpr } from "../expr/serializeExpr";
import { createDefaultContext } from "../helpers/ContextHelpers";

export interface CliOutputOptions {
  onlyBlocked?: boolean;
}

export abstract class CliOutput {
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
    spec: LabelerSpec,
    compiledOutput: SqrlCompiledOutput
  ): Promise<void>;
}

export class CliExprOutput extends CliCompileOutput {
  async compiled(spec: LabelerSpec, compiledOutput: SqrlCompiledOutput) {
    const { slotNames, slotExprs } = await compiledOutput.fetchBuildOutput(
      createDefaultContext()
    );
    console.log(
      jsonStableStringify({
        slotExprs: slotExprs.map(expr => serializeExpr(expr)),
        slotNames
      })
    );
  }
}

export class CliSlotJsOutput extends CliCompileOutput {
  async compiled(spec: LabelerSpec, compiledOutput: SqrlCompiledOutput) {
    console.log(jsonStableStringify(spec));
  }
}

export abstract class CliActionOutput extends CliOutput {
  abstract action(
    manipulator: SimpleManipulator,
    execution: SqrlExecutionState,
    loggedFeatures: FeatureMap
  );
}

export class CliJsonOutput extends CliActionOutput {
  constructor(private options: CliOutputOptions) {
    super();
  }
  action(
    manipulator: SimpleManipulator,
    execution: SqrlExecutionState,
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
    super();
  }
  action(
    manipulator: SimpleManipulator,
    execution: SqrlExecutionState,
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
