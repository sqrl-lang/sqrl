/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { diffStringsUnified } from "jest-diff";
import { AssertService, SqrlObject, sqrlCompare, invariant } from "sqrl-common";

export class JestAssertService implements AssertService {
  private captureError(manipulator: any, err: Error) {
    // tslint:disable-next-line:no-console
    console.log(err.message);

    // Since we log out the error message, we don't need to print the same
    // error twice. The stacktrace is also rather useless so skip it.
    const manipulatorError = new Error("Assertion failed inside SQRL");
    manipulatorError.stack = "";
    manipulator.logError(manipulatorError);
  }

  compare(
    manipulator: any,
    left: any,
    operator: string,
    right: any,
    arrow: string
  ) {
    try {
      (expect(left) as any).toSqrlCompare(operator, right, arrow);
    } catch (err) {
      invariant(err instanceof Error, "Expected error object");
      this.captureError(manipulator, err);
    }
  }
  ok(manipulator: any, value: any, arrow: string) {
    try {
      (expect(value) as any).toBeSqrlTruthy(arrow);
    } catch (err) {
      invariant(err instanceof Error, "Expected error object");
      this.captureError(manipulator, err);
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
          const diffString = diffStringsUnified(expected, received, {
            expand: (this as any).expand,
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
  },
});
