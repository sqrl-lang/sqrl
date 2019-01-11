/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console

import jsonStableStringify = require("fast-stable-stringify");
import { Writable } from "stream";
import {
  serializeExpr,
  FeatureMap,
  Execution,
  ExecutableCompiler,
  ExecutableSpec,
  createSimpleContext,
  SimpleManipulator
} from "sqrl";
import { invariant, SqrlObject } from "sqrl-common";
import * as csvStringify from "csv-stringify";

export interface CliOutputOptions {
  stdout?: Writable;
  features?: string[];
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
  private features: string[];
  private stringifier: csvStringify.Stringifier;

  constructor(private options: CliOutputOptions) {
    super(options.stdout || process.stdout);
    invariant(
      Array.isArray(options.features) && options.features.length,
      "At-least one feature output required for CSV"
    );
    this.features = options.features;
  }
  startStream() {
    this.stringifier = csvStringify({});
    this.stringifier.pipe(this.stdout);
    this.stringifier.write(this.features);
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

    const row = this.features.map(name => {
      return SqrlObject.ensureBasic(loggedFeatures[name]);
    });

    if (this.stringifier) {
      this.stringifier.write(row);
    } else {
      this.startStream();
      this.stringifier.write(row);
      this.close();
    }
  }

  close() {
    this.stringifier.end();
  }
}
