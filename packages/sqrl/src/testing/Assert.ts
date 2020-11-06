/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { foreachObject } from "../jslib/foreachObject";
import invariant from "../jslib/invariant";
import stringify = require("fast-stable-stringify");
import util = require("util");

export class Assertion {
  message: string;
  stack: string;
  error: Error;

  constructor(public result: boolean, format?: string, ...message: any[]) {
    this.message = format
      ? util.format(format, ...message)
      : "Assertion failed";

    this.stack = new Error().stack
      .split("\n")
      .filter((line) => {
        return !line.includes(__dirname + "/");
      })
      .join("\n");
  }
}

export class AssertionList extends Assertion {
  assertions: Assertion[];

  constructor(assertions: Assertion[], format?: string, ...args: any[]) {
    const failed = assertions.filter((a) => !a.result);
    const failedMessages = failed.map((a) => a.message);

    let message: string;
    if (format) {
      message = util.format(format, ...args);
      if (failedMessages.length) {
        message = failedMessages[0] + "\nFrom: " + message;
      }
    } else if (failedMessages.length) {
      message = failedMessages.join("\n");
    } else {
      message = "Assertion in list failed";
    }

    super(failed.length === 0, message);
    this.assertions = assertions;
  }
}

class OpAssertion extends Assertion {
  actual: any;
  expected: any;

  constructor(actual, expected, op, ...message: any[]) {
    const OPERATORS = {
      "===": (actual, expected) => actual === expected,
      // tslint:disable-next-line
      "==": (actual, expected) => actual == expected,
      "!==": (actual, expected) => actual !== expected,
      // tslint:disable-next-line
      "!=": (actual, expected) => actual != expected,
      ">": (actual, expected) => actual > expected,
      ">=": (actual, expected) => actual >= expected,
      "<": (actual, expected) => actual < expected,
      "<=": (actual, expected) => actual <= expected,
    };
    invariant(OPERATORS.hasOwnProperty(op), "Operator not defined: %s", op);

    if (!message.length) {
      message = ["%j %s %j", actual, op, expected];
    }
    super(OPERATORS[op](actual, expected), ...message);
    this.actual = actual;
    this.expected = expected;
  }
}

class TypeAssertion extends OpAssertion {
  static getType(value) {
    if (value === null) {
      return "null";
    } else if (Array.isArray(value)) {
      return "array";
    } else {
      return typeof value;
    }
  }

  constructor(actual, expected, ...msg: any[]) {
    const actualType = TypeAssertion.getType(actual);
    const expectedType = TypeAssertion.getType(expected);
    if (!msg.length) {
      msg = ["%s === %s [type mismatch]", actualType, expectedType];
    }
    super(actualType, expectedType, "===", ...msg);
  }
}

export class DeepEqualAssertion extends AssertionList {
  actual: any;
  expected: any;

  constructor(actual, expected, ...msg: any[]) {
    const assertions = [new TypeAssertion(actual, expected)];

    if (assertions.every((a) => a.result)) {
      if (Array.isArray(actual)) {
        assertions.push(
          new OpAssertion(
            actual.length,
            expected.length,
            "===",
            "%d === %d (length mismatch)",
            actual.length,
            expected.length
          )
        );
        if (assertions.every((a) => a.result)) {
          assertions.push(
            ...actual.map((value, idx) => {
              return new DeepEqualAssertion(
                value,
                expected[idx],
                "actual[%d] (=) expected[%d]",
                idx,
                idx
              );
            })
          );
        }
      } else if (actual !== expected && typeof actual === "object") {
        assertions.push(
          new DeepEqualAssertion(
            Object.keys(actual).sort(),
            Object.keys(expected).sort(),
            "keys(actual) (=) keys(expected)"
          )
        );
        if (assertions.every((a) => a.result)) {
          assertions.push(
            ...Object.keys(actual).map((key) => {
              return new DeepEqualAssertion(
                actual[key],
                expected[key],
                "actual[%j] (=) expected[%j]",
                key,
                key
              );
            })
          );
        }
      } else {
        assertions.push(new OpAssertion(actual, expected, "==="));
      }
    }

    super(assertions, ...msg);
    this.actual = actual;
    this.expected = expected;
  }
}

class IncludesAssertion extends Assertion {
  actual: any;
  expected: any;

  constructor(actual, expected, ...msg: any[]) {
    if (!msg.length) {
      msg = ["Expected value was not included"];
    }

    invariant(actual.includes, "Object %s not an array", stringify(actual));
    super(actual.includes(expected), ...msg);
    this.actual = actual;
    this.expected = expected;
  }
}

class ObjectContainingAssertion extends AssertionList {
  constructor(actual, expected) {
    const assertions = [];
    for (const key of Object.keys(expected)) {
      assertions.push(new OpAssertion(actual[key], expected[key], "==="));
    }
    super(
      assertions,
      "Object %s did not contain %s",
      stringify(actual),
      stringify(expected)
    );
  }
}

export default class Assert {
  static DeepEqualAssertion: any;
  captureList: Assertion[];

  constructor() {
    this.captureList = null;
  }

  capture(assertion) {
    invariant(assertion instanceof Assertion, "Expected instanceof Assertion");

    if (this.captureList === null) {
      throw assertion;
    } else {
      this.captureList.push(assertion);
    }
  }
  assertions(assertions, ...msg: any[]) {
    this.capture(new AssertionList(assertions, ...msg));
  }

  withCapture(callback) {
    const old = this.captureList;
    const list = [];
    this.captureList = list;
    try {
      callback();
    } finally {
      this.captureList = old;
    }
    return list;
  }

  async withCaptureAsync(callback: () => Promise<void>): Promise<Assertion[]> {
    const old = this.captureList;
    const list = [];
    this.captureList = list;
    try {
      await callback();
    } finally {
      this.captureList = old;
    }
    return list;
  }

  withStack(stack, callback) {
    const list = this.withCapture(callback);
    list.forEach((assertion) => {
      assertion.stack = stack;
      this.capture(assertion);
    });
  }

  map(map, callback, ...msg: any[]) {
    this.assertions(
      this.withCapture(() => {
        let index = 0;
        foreachObject(map, (value, key) => {
          this.assertions(
            this.withCapture(() => {
              callback(key, value);
            }),
            `Case ${index}: ${key} => ${value}`
          );
          index += 1;
        });
      }),
      ...msg
    );
  }

  error(err) {
    const assertion = new Assertion(false, `Error encountered: ${err}`);
    assertion.error = err;
    assertion.stack = err.stack;
    this.capture(assertion);
  }

  ok(value, ...msg: any[]) {
    this.capture(new Assertion(!!value, ...msg));
  }
  true(value, ...msg: any[]) {
    this.equal(value, true, ...msg);
  }
  false(value, ...msg: any[]) {
    this.equal(value, false, ...msg);
  }

  not(cb, format?: string, ...msg: any[]) {
    const list = this.withCapture(cb);
    const passed = list.filter((a) => a.result);

    // This is a really basic `not` assertion, that should ideally be replaced
    // with assertions that generate better messages, but that needs to be done
    // on a per exception basis.
    const message =
      (format ? util.format(format, ...msg) : "Not:\n") +
      passed
        .map((a) => {
          return a.message;
        })
        .join("\n");

    this.capture(new Assertion(passed.length === 0, message));
  }

  op(actual, operator, expected, ...msg: any[]) {
    this.capture(new OpAssertion(actual, expected, operator, ...msg));
  }
  equal(actual, expected, ...msg: any[]) {
    this.op(actual, "===", expected, ...msg);
  }
  notEqual(actual, expected, ...msg: any[]) {
    this.op(actual, "!==", expected, ...msg);
  }
  less(actual, expected, ...msg: any[]) {
    this.op(actual, "<", expected, ...msg);
  }
  lessEqual(actual, expected, ...msg: any[]) {
    this.op(actual, "<=", expected, ...msg);
  }
  greater(actual, expected, ...msg: any[]) {
    this.op(actual, ">", expected, ...msg);
  }
  greaterEqual(actual, expected, ...msg: any[]) {
    this.op(actual, ">=", expected, ...msg);
  }

  includes(arr, value, ...msg: any[]) {
    this.capture(new IncludesAssertion(arr, value, ...msg));
  }

  deepEqual<T>(actual: T, expected: T, ...msg: any[]) {
    this.capture(new DeepEqualAssertion(actual, expected, ...msg));
  }

  objectContaining(actual, expected) {
    this.capture(new ObjectContainingAssertion(actual, expected));
  }

  closeTo(value, expected, tolerance = 0.05, ...msg: any[]) {
    if (!msg.length) {
      msg = ["%f close to %f (within %f)", value, expected, tolerance];
    }
    const diff = Math.abs(value - expected);
    this.capture(new OpAssertion(diff, tolerance, "<=", ...msg));
  }
}
