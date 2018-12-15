/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import diff = require("jest-diff");
import { AssertService, SqrlObject, sqrlCompare } from "sqrl-common";

export class JestAssertService implements AssertService {
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
      // @TODO: We could throw the original error, but we already console.log
      // the message above. Just throw to ensure the test fails, but with no stacktrace.
      const err = new Error("Assertion failed inside SQRL");
      err.stack = "";
      throw err;
    }
  }
}

expect.extend({
  toBeSqrlTruthy(received, arrow) {
    const source = arrow
      ? "\n" + `Source:\n  ` + arrow.replace(/\n/g, "\n  ")
      : "";
    const pass = SqrlObject.isTruthy(received);
    const message = pass
      ? () =>
          this.utils.matcherHint(".not.toBe") +
          "\n\n" +
          `Expected value to not be truthy:\n` +
          `  ${this.utils.printReceived(received)}` +
          source
      : () => {
          return (
            this.utils.matcherHint(".toBe") +
            "\n\n" +
            `Expected value to be truthy:\n` +
            `  ${this.utils.printReceived(received)}` +
            source
          );
        };
    return { actual: received, message, pass };
  },
  toSqrlCompare(received, operator, expected, arrow) {
    const pass = sqrlCompare(received, operator, expected);

    const source = arrow
      ? "\n" + `Source:\n  ` + arrow.replace(/\n/g, "\n  ")
      : "";

    const message = pass
      ? () =>
          this.utils.matcherHint(".not.toBe") +
          "\n\n" +
          `Expected value to not be (using Object.is):\n` +
          `  ${this.utils.printExpected(expected)}\n` +
          `Received:\n` +
          `  ${this.utils.printReceived(received)}` +
          source
      : () => {
          const diffString = diff(expected, received, {
            expand: (this as any).expand
          });
          return (
            this.utils.matcherHint(".toBe") +
            "\n\n" +
            `Expected value to be (using Object.is):\n` +
            `  ${this.utils.printExpected(expected)}\n` +
            `Received:\n` +
            `  ${this.utils.printReceived(received)}` +
            (diffString ? `\n\nDifference:\n\n${diffString}` : "") +
            source
          );
        };

    return { actual: received, message, pass };
  }
});
