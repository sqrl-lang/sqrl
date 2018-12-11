/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry, {
  FunctionCostData
} from "../../src/function/FunctionRegistry";
import {
  registerAllFunctions,
  FunctionServices,
  KafkaService
} from "../../src/function/registerAllFunctions";
import { SimpleManipulator } from "../../src/simple/SimpleManipulator";
import { SqrlTest } from "../../src/testing/SqrlTest";
import { UniqueId } from "../../src/platform/UniqueId";
import util = require("util");
import { registerTestFunctions } from "./TestFunctions";
import { MockRedisService } from "../../src/mocks/MockRedisService";
import { MockRateLimit } from "../../src/mocks/MockRateLimit";
import { RedisCountService } from "../../src/services/RedisCountService";
import { RedisApproxCountUniqueService } from "../../src/services/RedisApproxCountUnique";
import { RedisLabelService } from "../../src/services/RedisLabelService";
import { JestAssertService } from "./JestAssert";
import { LocalFilesystem, Filesystem } from "../../src/api/filesystem";
import { InProcessPatternService } from "../../src/services/InProcessPatternService";
import * as path from "path";
import { UniqueIdService } from "../../src/function/NodeFunctions";
import invariant from "../../src/jslib/invariant";
import { SimpleBlockService } from "../../src/simple/SimpleBlockService";
import { getGlobalLogger, LogProperties, Logger } from "../../src/api/log";
import { AbstractLogger } from "../../src/util/Logger";
import { SimpleContext } from "../../src/platform/Trace";
import { SimpleDatabaseSet } from "../../src/platform/DatabaseSet";
import { Context } from "../../src/api/ctx";

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

export function buildServices(
  props: {
    startMs?: number;
  } = {}
): FunctionServices {
  const redis = new MockRedisService();

  return {
    assert: new JestAssertService(),
    block: new SimpleBlockService(),
    count: new RedisCountService(redis, "count~"),
    countUnique: new RedisApproxCountUniqueService(redis, "countUnique~"),
    label: new RedisLabelService(redis, "label~"),
    pattern: new InProcessPatternService(),
    rateLimit: new MockRateLimit(),
    saveFeatures: new MockKafkaService("saveFeatures"),
    uniqueId: new MockUniqueIdService(props.startMs || Date.now())
  };
}

export function buildTestTrace(logger?: Logger) {
  return new SimpleContext(
    new SimpleDatabaseSet("1"),
    logger || getGlobalLogger()
  );
}

export function buildFunctionRegistry(
  options: {
    services?: FunctionServices;
    functionCost?: FunctionCostData;
  } = {}
) {
  const functionRegistry = new FunctionRegistry({
    functionCost: options.functionCost
  });
  const services = options.services || buildServices();
  registerAllFunctions(functionRegistry, services);
  registerTestFunctions(functionRegistry);
  return functionRegistry;
}

export async function runSqrl(
  sqrl: string,
  options: {
    functionRegistry?: FunctionRegistry;
    services?: FunctionServices;
    logger?: Logger;
    filesystem?: Filesystem;
  } = {}
) {
  let functionRegistry;

  let services: FunctionServices = {};
  if (options.functionRegistry) {
    invariant(
      !options.services,
      ".services not compatible with .functionRegistry"
    );
    functionRegistry = options.functionRegistry;
  } else {
    services = options.services || buildServices();
    functionRegistry = buildFunctionRegistry({ services });
  }

  const filesystem =
    options.filesystem || new LocalFilesystem(path.join(__dirname, ".."));

  const test = new SqrlTest(functionRegistry, {
    manipulatorFactory: () => new SimpleManipulator(),
    filesystem
  });
  const ctx = buildTestTrace(options.logger);
  await test.run(
    ctx,
    `
  LET SqrlOutput := getSqrlOutput(SqrlExecutionComplete);
  LET SqrlKafka := jsonValue(SqrlOutput, '$.kafka');
  `
  );
  const rv = await test.run(ctx, sqrl);

  if (services.assert && services.assert instanceof JestAssertService) {
    services.assert.throwFirstError();
  }

  return {
    ...rv,
    lastManipulator: rv.lastState.manipulator as SimpleManipulator
  };
}

export function sqrlTest(name: string, sqrl: string) {
  test(name, () => runSqrl(sqrl));
}
