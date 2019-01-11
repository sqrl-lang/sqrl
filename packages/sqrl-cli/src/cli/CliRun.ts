/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
// tslint:disable:no-submodule-imports (@TODO)
import Semaphore from "sqrl/lib/jslib/Semaphore";
import * as split2 from "split2";
import { CliActionOutput } from "./CliOutput";
import { Context } from "sqrl/lib/api/ctx";
import { promiseFinally } from "sqrl-common";
import { FeatureMap, Executable, Execution, SimpleManipulator } from "sqrl";

export class CliRun {
  constructor(
    private executable: Executable,
    private output: CliActionOutput
  ) {}

  triggerRecompile(compileCallback: () => Promise<Executable>): Promise<void> {
    this.output.sourceRecompiling();
    return compileCallback()
      .then(rv => {
        this.executable = rv;
        this.output.sourceUpdated();
      })
      .catch(err => {
        this.output.sourceRecompileError(err);
      });
  }

  async action(trc: Context, inputs: FeatureMap, features: string[]) {
    const manipulator = new SimpleManipulator();
    const execution: Execution = await this.executable.execute(trc, {
      featureTimeoutMs: 10000,
      inputs,
      manipulator
    });

    const loggedFeatures = {};
    await Promise.all(
      features.map(async featureName => {
        const value = await execution.fetchFeature(featureName);
        loggedFeatures[featureName] = value;
      })
    );

    await execution.fetchFeature("SqrlExecutionComplete");
    await manipulator.mutate(trc);

    this.output.action(manipulator, execution, loggedFeatures);
  }

  async stream(options: {
    ctx: Context;
    streamFeature: string;
    concurrency: number;
    inputs: FeatureMap;
    features: string[];
  }) {
    const { concurrency } = options;

    const stream: NodeJS.ReadStream = process.stdin.pipe(split2());
    const busy = new Semaphore();

    stream.on("data", line => {
      // Convert this line to the given feature
      const lineValues = Object.assign({}, options.inputs);
      try {
        lineValues[options.streamFeature] = JSON.parse(line);
      } catch (err) {
        console.error(
          "Error: Invalid JSON value: %s",
          JSON.stringify(line) + err.toString()
        );
        return;
      }

      // @todo: Perhaps we want to run serially to ensure output is more easily digestable
      promiseFinally(
        busy.wrap(
          this.action(options.ctx, lineValues, options.features).catch(err => {
            console.error("Error: " + err.toString());
          })
        ),
        () => {
          stream.resume();
        }
      );

      if (concurrency && busy.getCount() === concurrency) {
        stream.pause();
      }
    });

    // Wait for the stream to finish
    await new Promise((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", err => reject(err));
    });
    await busy.waitForZero();
  }

  close() {
    this.output.close();
  }
}
