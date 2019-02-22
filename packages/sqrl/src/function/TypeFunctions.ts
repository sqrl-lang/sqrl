/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlObject } from "../object/SqrlObject";
import { SqrlFunctionRegistry } from "./FunctionRegistry";
const FLOAT_REGEX = /^-?[0-9]*(\.[0-9]+)?$/;

function float(value: any): number | null {
  if (value instanceof Buffer) {
    value = value.toString("utf-8");
  } else {
    value = SqrlObject.ensureBasic(value);
  }

  if (typeof value === "number") {
    return value;
  } else if (value && typeof value === "string" && FLOAT_REGEX.test(value)) {
    value = parseFloat(value);
    if (!Number.isFinite(value)) {
      return null;
    }
    return value;
  }

  return null;
}

function int(value: any): number | null {
  value = float(value);
  if (value === null) {
    return null;
  }

  return Math.floor(value);
}
export function registerTypeFunctions(registry: SqrlFunctionRegistry) {
  registry.save(int, {
    argCount: 1,
    pure: true,
    allowSqrlObjects: true
  });

  registry.save(SqrlObject.isTruthy, {
    name: "nonNullBool",
    allowSqrlObjects: true,
    allowNull: true,
    argCount: 1,
    pure: true
  });

  registry.save(SqrlObject.isTruthy, {
    name: "bool",
    argCount: 1,
    allowSqrlObjects: true,
    pure: true
  });

  registry.save(float, {
    argCount: 1,
    pure: true,
    allowSqrlObjects: true
  });

  registry.save(
    function list(...values) {
      return values;
    },
    {
      allowSqrlObjects: true,
      pure: true,
      argstring: "value, ...",
      docstring: "Returns a list of the provided values"
    }
  );

  registry.save(
    function str(value) {
      if (Array.isArray(value)) {
        return "[array]";
      } else if (typeof value === "object") {
        return "[object]";
      } else {
        return (value != null ? value : "").toString();
      }
    },
    {
      argCount: 1,
      pure: true,
      argstring: "value",
      docstring: "Creates a string representation of the given value"
    }
  );

  registry.save(
    function basic(value) {
      return value;
    },
    {
      argCount: 1,
      pure: true,
      argstring: "value",
      docstring: "Returns the basic representation of the given value"
    }
  );

  registry.save(
    function intMap(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      return arr.map(int);
    },
    {
      argCount: 1,
      pure: true
    }
  );

  registry.save(
    function floatMap(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      return arr.map(float);
    },
    {
      allowSqrlObjects: true,
      argCount: 1,
      pure: true
    }
  );
}
