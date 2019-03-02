/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";

import { AstTypes as AT } from "../ast/AstTypes";

export function registerMathFunctions(registry: StdlibRegistry) {
  const safeMathOpts = {
    args: [AT.any, AT.any],
    pure: true,
    safe: true
  };

  registry.save(
    function abs(value) {
      const result = Math.abs(value);
      return isNaN(result) ? null : result;
    },
    {
      args: [AT.any.number],
      argstring: "number",
      docstring: "Returns the absolute (non-negative) value of the given number"
    }
  );

  registry.save(
    function round(value) {
      const result = Math.round(value);
      return isNaN(result) ? null : result;
    },
    {
      args: [AT.any.number],
      argstring: "number",
      docstring: "Returns the rounded value of the given number"
    }
  );

  /**
   * Filters the given list, removes any nulls and returns an empty list if
   * there are any non-numbers
   */
  function filterNumberList(values: any[]): number[] {
    values = values.filter(v => v !== null);
    if (values.some(v => typeof v !== "number" || isNaN(v))) {
      return [];
    } else {
      return values;
    }
  }

  registry.save(
    function max(values) {
      values = filterNumberList(values);
      if (values.length === 0) {
        return null;
      }
      return Math.max(...values);
    },
    {
      allowNull: true,
      args: [AT.any.array],
      argstring: "number list",
      docstring: "Returns the maximum value in the list provided"
    }
  );

  registry.save(
    function min(values) {
      values = filterNumberList(values);
      if (values.length === 0) {
        return null;
      }
      return Math.min(...values);
    },
    {
      allowNull: true,
      args: [AT.any.array],
      argstring: "number list",
      docstring: "Returns the minimum value in the list provided"
    }
  );

  registry.save(
    function sum(values) {
      values = filterNumberList(values);
      if (values.length === 0) {
        return null;
      }
      return values.reduce((a, b) => a + b, 0);
    },
    {
      allowNull: true,
      args: [AT.any.array],
      argstring: "number list",
      docstring: "Returns the sum of the values in the list provided"
    }
  );

  registry.save(
    function log10(value) {
      if (typeof value !== "number") {
        return null;
      }
      const result = Math.log10(value);
      return isNaN(result) ? null : result;
    },
    {
      args: [AT.any.number],
      argstring: "number",
      docstring: "Returns the base 10 logarithm of the given number"
    }
  );

  registry.save(
    function _add(left, right) {
      if (typeof left !== "number" || typeof right !== "number") {
        return null;
      }
      return left + right;
    },
    {
      ...safeMathOpts,
      argstring: "number, number",
      docstring: "Returns the sum of the given numbers"
    }
  );
  registry.save(
    function _subtract(left, right) {
      if (typeof left !== "number" || typeof right !== "number") {
        return null;
      }
      return left - right;
    },
    {
      ...safeMathOpts,
      argstring: "number, number",
      docstring: "Returns the difference of the given numbers"
    }
  );
  registry.save(
    function _multiply(left, right) {
      if (typeof left !== "number" || typeof right !== "number") {
        return null;
      }
      return left * right;
    },
    {
      ...safeMathOpts,
      argstring: "number, number",
      docstring: "Returns the product of the given numbers"
    }
  );

  // modulo is special due to division by zero error
  registry.save(
    function _modulo(state, left, right) {
      if (right === 0) {
        state.logError(new Error("Modulo by zero"));
        return null;
      }
      return left % right;
    },
    {
      ...safeMathOpts,
      args: [AT.state, AT.any.number, AT.any.number],
      pure: false,
      argstring: "dividend, divisor",
      docstring: "Return the remainder of the division"
    }
  );

  // Divide is special due to division by zero error
  registry.save(
    function _divide(state, left, right) {
      if (typeof left !== "number" || typeof right !== "number") {
        return null;
      } else if (right === 0) {
        state.logError(new Error("Division by zero"));
        return null;
      }
      return left / right;
    },
    {
      ...safeMathOpts,
      args: [AT.state, AT.any, AT.any],
      pure: false,

      argstring: "dividend, divisor",
      docstring: "Return the floating point result of the division"
    }
  );
}
