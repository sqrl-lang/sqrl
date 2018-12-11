/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";

import { default as AT } from "../ast/AstTypes";
import crypto = require("crypto");

function sha256HexSync(data: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("hex");
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

export function registerMathFunctions(registry: FunctionRegistry) {
  const safeMathOpts = {
    argCount: 2,
    pure: true,
    safe: true
  };

  registry.save(
    function abs(value) {
      const result = Math.abs(value);
      return isNaN(result) ? null : result;
    },
    {
      args: [AT.any.number]
    }
  );

  registry.save(
    function round(value) {
      const result = Math.round(value);
      return isNaN(result) ? null : result;
    },
    {
      args: [AT.any.number]
    }
  );

  const arrayMax = arrayMath.bind(null, Math.max.bind(Math));
  registry.save(arrayMax, { name: "arrayMax" });
  registry.save(
    function max(...values) {
      return arrayMax(values);
    },
    {
      allowNull: true
    }
  );

  const arrayMin = arrayMath.bind(null, Math.min.bind(Math));
  registry.save(arrayMin, { name: "arrayMin" });
  registry.save(
    function min(...values) {
      return arrayMin(values);
    },
    {
      allowNull: true
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
      argCount: 1
    }
  );

  registry.save(function add(left, right) {
    if (typeof left !== "number" || typeof right !== "number") {
      return null;
    }
    return left + right;
  }, safeMathOpts);
  registry.save(function subtract(left, right) {
    if (typeof left !== "number" || typeof right !== "number") {
      return null;
    }
    return left - right;
  }, safeMathOpts);
  registry.save(function multiply(left, right) {
    if (typeof left !== "number" || typeof right !== "number") {
      return null;
    }
    return left * right;
  }, safeMathOpts);

  // modulo is special due to division by zero error
  registry.save(
    function modulo(state, left, right) {
      if (right === 0) {
        state.logError(new Error("modulo by zero"));
        return null;
      }
      return left % right;
    },
    Object.assign({}, safeMathOpts, {
      args: [AT.state, AT.any.number, AT.any.number],
      pure: false
    })
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
    Object.assign({}, safeMathOpts, {
      stateArg: true,
      argCount: 3,
      pure: false
    })
  );

  registry.save(sha256HexSync, {
    args: [AT.any],
    name: "sha256",
    pure: true,
    background: true
  });
}
