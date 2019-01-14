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
import { UniqueId, UniqueIdService } from "../api/services";
import { SimpleBlockService } from "../simple/SimpleBlockService";
import { Context } from "../api/ctx";
import { AssertService } from "sqrl-common";
import { FunctionRegistry } from "../api/execute";

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
    const remainder = this.remainder;
    this.remainder += 1;
    return new SimpleId(this.time, remainder);
  }
  async fetch(ctx: Context, type, key) {
    this.db[type] = this.db[type] || {};
    if (!this.db[type][key]) {
      this.db[type][key] = await this.create(ctx);
    }
    return this.db[type][key];
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
