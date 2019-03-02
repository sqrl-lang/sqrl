/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  SqrlFunctionRegistry,
  FunctionCostData
} from "../function/FunctionRegistry";
import { registerAllFunctions } from "../function/registerAllFunctions";
import { AssertService } from "sqrl-common";
import { FunctionRegistry, FunctionServices } from "../api/execute";
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

export async function buildTestFunctionRegistry(
  options: {
    config?: Config;
    functionCost?: FunctionCostData;
    services?: FunctionServices;
  } = {}
) {
  const functionRegistry = new SqrlFunctionRegistry({
    functionCost: options.functionCost
  });

  let assert: AssertService;
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    const { JestAssertService } = await require("sqrl-test-utils");
    assert = new JestAssertService();
  } catch (err) {
    assert = new CapturingAssertService();
  }

  registerAllFunctions(functionRegistry, {
    assert,
    ...(options.services || {})
  });
  return new FunctionRegistry(
    {
      ...getDefaultConfig(),
      "state.allow-in-memory": true,
      ...(options.config || {})
    },
    functionRegistry
  );
}
