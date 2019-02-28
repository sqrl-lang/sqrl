/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";

import { AstTypes as AT } from "../ast/AstTypes";
import crypto = require("crypto");

function sha256HexSync(data: Buffer | string): string {
  const hasher = crypto.createHash("sha256");
  if (data instanceof Buffer) {
    hasher.update(data);
  } else {
    hasher.update(data, "utf8");
  }
  return hasher.digest("hex");
}

function arrayMath(callback, values, defaultValue = null) {
  values = values.filter((value?) => value !== null);
  if (values.some((value?) => typeof value !== "number")) {
    return null;
  }
  if (!values.length) {
    return defaultValue;
  }
  const result = callback(...values);
  return isNaN(result) ? null : result;
}

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

  const arrayMax = arrayMath.bind(null, Math.max.bind(Math));
  registry.save(arrayMax, {
    name: "arrayMax",
    argstring: "numbers",
    docstring: "Returns the maximum value of the numbers provided"
  });
  registry.save(
    function max(...values) {
      return arrayMax(values);
    },
    {
      allowNull: true,
      argstring: "number[, ...]",
      docstring: "Returns the maximum value of the arguments provided"
    }
  );

  const arrayMin = arrayMath.bind(null, Math.min.bind(Math));
  registry.save(arrayMin, {
    name: "arrayMin",
    argstring: "numbers",
    docstring: "Returns the minimum value of the numbers provided"
  });
  registry.save(
    function min(...values) {
      return arrayMin(values);
    },
    {
      allowNull: true,
      argstring: "number[, ...]",
      docstring: "Returns the minimum value of the arguments provided"
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
    function add(left, right) {
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
    function subtract(left, right) {
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
    function multiply(left, right) {
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
    function modulo(state, left, right) {
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
    function divide(state, left, right) {
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

  registry.save(sha256HexSync, {
    args: [AT.any],
    name: "sha256",
    pure: true,
    background: true,
    argstring: "value",
    docstring: "Returns the sha256 hash of the given value as hex"
  });
}
