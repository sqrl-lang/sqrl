/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlObject } from "../object/SqrlObject";
import { StdlibRegistry } from "./Instance";
import { AstTypes as AT } from "../ast/AstTypes";

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
export function registerTypeFunctions(instance: StdlibRegistry) {
  instance.save(int, {
    args: [AT.any],
    pure: true,
    allowSqrlObjects: true,
    argstring: "value",
    docstring: "Returns the integer value of the given input value"
  });

  instance.save(SqrlObject.isTruthy, {
    name: "bool",
    args: [AT.any],
    allowSqrlObjects: true,
    pure: true,
    argstring: "value",
    docstring: "Returns the boolean value of the given input value"
  });

  instance.save(float, {
    args: [AT.any],
    pure: true,
    allowSqrlObjects: true,
    argstring: "value",
    docstring: "Returns the floating point value of the given input value"
  });

  instance.save(
    function list(...values) {
      return values;
    },
    {
      allowSqrlObjects: true,
      pure: true,
      argstring: "value[, ...]",
      docstring: "Returns a list of the provided values"
    }
  );

  instance.save(
    function str(value) {
      if (Array.isArray(value)) {
        return "[array]";
      } else if (typeof value === "object") {
        return "[object]";
      } else if (typeof value === "undefined") {
        // @todo: We should ensure this doesn't happen, but log the string to reduce confusion
        return "[undefined]";
      } else {
        return value.toString();
      }
    },
    {
      args: [AT.any],
      pure: true,
      argstring: "value",
      docstring: "Creates a string representation of the given value"
    }
  );

  instance.save(
    function basic(value) {
      return value;
    },
    {
      args: [AT.any],
      pure: true,
      argstring: "value",
      docstring: "Returns the basic representation of the given value"
    }
  );
}
