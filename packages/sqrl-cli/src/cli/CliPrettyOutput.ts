/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlExecutionState } from "sqrl/lib/execute/SqrlExecutionState";
import * as moment from "moment";
import chalk from "chalk";
import { SimpleManipulator } from "sqrl/lib/simple/SimpleManipulator";
import SqrlObject from "sqrl/lib/object/SqrlObject";
import * as util from "util";
import { SqrlCompileError } from "sqrl/lib/api/parse";
import { CliOutputOptions, CliActionOutput } from "./CliOutput";
import { FeatureMap } from "sqrl";

const CHECKMARK = "\u2713";
const CROSS = "\u2717";
const DOWNWARDS_ARROW = "\u21b3";

enum State {
  none = 1,
  unknown,
  recompiling,
  summary
}

function prefixLines(text, prefix) {
  return prefix + text.replace(/\n/g, "\n" + prefix);
}

export class CliPrettyOutput extends CliActionOutput {
  private blocked = 0;
  private allowed = 0;
  private state: State = State.none;
  private summaryInterval: NodeJS.Timer;
  private lastSummary: number;
  private lastCount = 0;

  constructor(private options: CliOutputOptions) {
    super(options.stdout);
    this.lastSummary = Date.now();
  }

  private writeSummary() {
    const count = this.blocked + this.allowed;
    const perMin =
      (count - this.lastCount) / ((Date.now() - this.lastSummary) / 60000);

    let speed;
    if (perMin < 1000) {
      speed = `${perMin.toFixed(1)}/min`;
    } else {
      speed = `${(perMin / 60).toFixed(1)}/sec`;
    }

    if (this.state !== State.summary) {
      this.open(State.summary);
    }
    this.line(
      moment().format("YYYY-MM-DD HH:mm:ss ") +
        chalk.red(`${this.blocked} actions blocked`) +
        ", " +
        chalk.green(`${this.allowed} actions allowed`) +
        chalk.gray(` (${speed})`)
    );

    this.lastCount = count;
    this.lastSummary = Date.now();
  }

  private open(state: State = State.unknown) {
    if (this.state !== State.none) {
      // Leave a blank line between each action
      process.stdout.write("\n");
    }
    this.state = state;
  }

  private line(format: string, ...param: any[]) {
    process.stdout.write(util.format(format, ...param) + "\n");
  }

  private errorText(err: Error) {
    if (err instanceof SqrlCompileError) {
      return err.toSqrlErrorOutput({
        codedError: false,
        source: true,
        stacktrace: false
      });
    } else {
      return err.stack;
    }
  }

  close() {
    if (this.summaryInterval) {
      this.writeSummary();
      clearInterval(this.summaryInterval);
      this.summaryInterval = null;
    }
  }

  compileError(err: Error) {
    this.line(this.errorText(err));
  }

  sourceRecompiling() {
    this.open(State.recompiling);
    this.line(chalk.yellow("Source changed, recompiling..."));
  }

  sourceUpdated() {
    if (this.state === State.recompiling) {
      this.state = State.unknown;
    } else {
      this.open();
    }
    this.line(chalk.green("Source updated."));
  }

  sourceRecompileError(err: Error) {
    if (this.state === State.recompiling) {
      this.state = State.unknown;
    } else {
      this.open();
    }
    this.line(chalk.redBright("New source failed to compile:"));
    this.line(prefixLines(this.errorText(err), chalk.red(">") + " "));
  }

  startStream() {
    this.summaryInterval = setInterval(() => this.writeSummary(), 1000);
    this.summaryInterval.unref();
  }

  action(
    manipulator: SimpleManipulator,
    execution: SqrlExecutionState,
    loggedFeatures: FeatureMap
  ) {
    if (manipulator.wasBlocked()) {
      this.blocked += 1;
    } else {
      this.allowed += 1;
    }

    if (this.options.onlyBlocked && !manipulator.wasBlocked()) {
      return;
    }

    this.open();

    const timestamp = moment(execution.getClock());
    const time = " " + chalk.gray(timestamp.format("YYYY-MM-DD HH:mm")) + " ";
    if (manipulator.wasBlocked()) {
      this.line(
        chalk.red.bold(CROSS) + time + chalk.red("action was blocked.")
      );
      manipulator.blockedRules.forEach(details => {
        this.line(
          chalk.red(
            `${DOWNWARDS_ARROW} [${details.name}]` +
              (details.reason ? ": " + details.reason : "")
          )
        );
      });
    } else {
      this.line(
        chalk.green(CHECKMARK) + time + chalk.green("action was allowed.")
      );
    }

    Object.assign(loggedFeatures, manipulator.loggedFeatures);
    for (const key of Object.keys(loggedFeatures).sort()) {
      const value = loggedFeatures[key];
      if (value instanceof SqrlObject) {
        this.line(
          "%s=%s %s",
          key,
          JSON.stringify(value.getBasicValue()),
          value.renderText().trimRight()
        );
      } else {
        this.line("%s=%s", key, JSON.stringify(value));
      }
    }

    manipulator.logged.forEach(message => this.line(message));
  }
}
