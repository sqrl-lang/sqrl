/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  SqrlFunctionRegistry,
  FunctionCostData
} from "../function/FunctionRegistry";
import {
  registerAllFunctions,
  FunctionServices,
  KafkaService
} from "../function/registerAllFunctions";
import { SimpleManipulator } from "../simple/SimpleManipulator";
import { SqrlTest } from "./SqrlTest";
import { UniqueId } from "../api/UniqueId";
import util = require("util");
import { LocalFilesystem, Filesystem } from "../api/filesystem";
import * as path from "path";
import { UniqueIdService } from "../api/UniqueIdService";
import invariant from "../jslib/invariant";
import { SimpleBlockService } from "../simple/SimpleBlockService";
import { LogProperties, Logger } from "../api/log";
import { AbstractLogger } from "../util/Logger";
import { Context, createSimpleContext } from "../api/ctx";
import { AssertService } from "sqrl-common";
import { Execution, FunctionRegistry } from "../api/execute";

class SimpleId extends UniqueId {
  constructor(private timeMs: number, private remainder: number) {
    super();
  }
  getTimeMs(): number {
    return this.timeMs;
  }
  getRemainder(): number {
    return this.remainder;
  }
  getBuffer(): Buffer {
    return Buffer.alloc(8, 0);
  }
  getNumberString(): string {
    return "0";
  }
}

class MockUniqueIdService implements UniqueIdService {
  private db = {};
  private remainder = 0;
  constructor(private time: number) {
    /* do nothing yet */
  }
  async create(ctx: Context) {
    return new SimpleId(this.time, this.remainder);
  }
  async fetch(ctx: Context, type, key) {
    this.db[type] = this.db[type] || {};
    if (!this.db[type][key]) {
      this.db[type][key] = await this.create(ctx);
      this.remainder += 1;
    }
    return this.db[type][key];
  }
}

export class TestLogger extends AbstractLogger {
  errors: {
    msg: string;
    level: string;
  }[] = [];

  countErrors() {
    let errorCount = 0;
    for (const { level } of this.errors) {
      if (level === "trace" || level === "debug" || level === "info") {
        continue;
      }
      errorCount += 1;
    }
    return errorCount;
  }
  popLatest(props: { level: string }) {
    const { level } = props;
    for (let idx = this.errors.length - 1; idx >= 0; idx--) {
      if (this.errors[idx].level === level) {
        return this.errors.splice(idx, 1)[0];
      }
    }
    throw new Error("No log line found");
  }
  log(level: string, props: LogProperties, format: string, ...param: any[]) {
    const message = util.format(format, ...param);
    // tslint:disable-next-line
    this.errors.push({
      msg: message,
      level
    });
    // tslint:disable-next-line:no-console
    console.error(message);
  }
}

class MockKafkaService extends KafkaService {
  constructor(private topic: string) {
    super();
  }
  writeJson(manipulator: SimpleManipulator, obj: any) {
    manipulator.addKafka(this.topic, Buffer.from(JSON.stringify(obj)));
  }
}

export class SimpleAssertService implements AssertService {
  private firstError: Error;

  private captureError(err: Error) {
    this.firstError = this.firstError || err;

    // tslint:disable-next-line:no-console
    console.log(err.message);
  }

  compare(left: any, operator: string, right: any, arrow: string) {
    try {
      (expect(left) as any).toSqrlCompare(operator, right, arrow);
    } catch (err) {
      this.captureError(err);
    }
  }
  ok(value: any, arrow: string) {
    try {
      (expect(value) as any).toBeSqrlTruthy(arrow);
    } catch (err) {
      this.captureError(err);
    }
  }

  throwFirstError() {
    if (this.firstError) {
      throw this.firstError;
    }
  }
}

export async function buildTestServices(
  props: {
    startMs?: number;
  } = {}
): Promise<FunctionServices> {
  let assert: AssertService;
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    const { JestAssertService } = await require("sqrl-test-utils");
    assert = new JestAssertService();
  } catch (err) {
    assert = new SimpleAssertService();
  }
  return {
    assert,
    block: new SimpleBlockService(),
    saveFeatures: new MockKafkaService("saveFeatures"),
    uniqueId: new MockUniqueIdService(props.startMs || Date.now())
  };
}

export async function buildTestFunctionRegistry(
  options: {
    services?: FunctionServices;
    functionCost?: FunctionCostData;
  } = {}
) {
  const functionRegistry = new SqrlFunctionRegistry({
    functionCost: options.functionCost
  });
  const services = options.services || (await buildTestServices());
  registerAllFunctions(functionRegistry, services);
  return new FunctionRegistry(functionRegistry);
}

export async function runSqrlTest(
  sqrl: string,
  options: {
    functionRegistry?: FunctionRegistry;
    services?: FunctionServices;
    logger?: Logger;
    filesystem?: Filesystem;
    librarySqrl?: string;
  } = {}
): Promise<{
  codedErrors: Error[];
  lastState: Execution;
  lastManipulator: SimpleManipulator;
}> {
  let functionRegistry: FunctionRegistry;

  let services: FunctionServices = {};
  if (options.functionRegistry) {
    invariant(
      !options.services,
      ".services not compatible with .functionRegistry"
    );
    functionRegistry = options.functionRegistry;
  } else {
    services = options.services || (await buildTestServices());
    functionRegistry = await buildTestFunctionRegistry({ services });
  }

  const filesystem =
    options.filesystem || new LocalFilesystem(path.join(__dirname, ".."));

  const test = new SqrlTest(functionRegistry._wrapped, {
    manipulatorFactory: () => new SimpleManipulator(),
    filesystem
  });
  const ctx = createSimpleContext(options.logger);
  if (options.librarySqrl) {
    await test.run(ctx, options.librarySqrl);
  }
  const rv = await test.run(ctx, sqrl);

  if (services.assert && services.assert.throwFirstError) {
    services.assert.throwFirstError();
  }

  return {
    ...rv,
    lastManipulator: rv.lastState.manipulator as SimpleManipulator
  };
}
