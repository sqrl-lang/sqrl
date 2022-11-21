/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlInstance, FunctionCostData } from "../function/Instance";
import { registerAllFunctions } from "../function/registerAllFunctions";
import { AssertService, invariant } from "sqrl-common";
import { Instance, FunctionServices } from "../api/execute";
import { getDefaultConfig, Config } from "../api/config";

export class CapturingAssertService implements AssertService {
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
      invariant(err instanceof Error, "Expected Error object");
      this.captureError(err);
    }
  }
  ok(value: any, arrow: string) {
    try {
      (expect(value) as any).toBeSqrlTruthy(arrow);
    } catch (err) {
      invariant(err instanceof Error, "Expected Error object");
      this.captureError(err);
    }
  }

  throwFirstError() {
    if (this.firstError) {
      throw this.firstError;
    }
  }
}

export async function buildTestInstance(
  options: {
    config?: Config;
    functionCost?: FunctionCostData;
    services?: FunctionServices;
  } = {}
) {
  const instance = new SqrlInstance({
    functionCost: options.functionCost,
  });

  let assert: AssertService;
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    const { JestAssertService } = await require("sqrl-test-utils");
    assert = new JestAssertService();
  } catch (err) {
    assert = new CapturingAssertService();
  }

  registerAllFunctions(instance, {
    assert,
    ...(options.services || {}),
  });
  return new Instance(
    {
      ...getDefaultConfig(),
      "state.allow-in-memory": true,
      ...(options.config || {}),
    },
    instance
  );
}
