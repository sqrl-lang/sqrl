/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
import { SqrlExecutable } from "../execute/SqrlExecutable";
import { FeatureMap } from "../feature/FeatureTypes";
import { SimpleManipulator } from "../simple/SimpleManipulator";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import Semaphore from "../jslib/Semaphore";
import * as split2 from "split2";
import { CliActionOutput } from "./CliOutput";
import { Context } from "../api/ctx";

export class CliRun {
  constructor(
    private executable: SqrlExecutable,
    private output: CliActionOutput
  ) {}

  triggerRecompile(
    compileCallback: () => Promise<SqrlExecutable>
  ): Promise<void> {
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
    const execution: SqrlExecutionState = await this.executable.startExecution(
      trc,
      {
        featureTimeoutMs: 10000,
        inputs,
        manipulator
      }
    );

    const loggedFeatures = {};
    await Promise.all(
      features.map(async featureName => {
        const value = await execution.fetchByName(featureName);
        loggedFeatures[featureName] = value;
      })
    );

    await execution.fetchBasicByName("SqrlExecutionComplete");
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
      busy
        .wrap(
          this.action(options.ctx, lineValues, options.features).catch(err => {
            console.error("Error: " + err.toString());
          })
        )
        .finally(() => {
          stream.resume();
        });

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
