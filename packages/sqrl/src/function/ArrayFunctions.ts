/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./FunctionRegistry";
import { AstTypes as AT } from "../ast/AstTypes";

import flatten from "../jslib/flatten";
import invariant from "../jslib/invariant";
import { SqrlObject } from "../object/SqrlObject";

function _isStringOrArray(v?) {
  return typeof v === "string" || Array.isArray(v);
}

export function registerArrayFunctions(registry: StdlibRegistry) {
  registry.save(
    function dedupe(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      const seenValues = new Set();
      return arr.filter((v?) => {
        if (v === null) {
          return false;
        }
        const basicValue = SqrlObject.ensureBasic(v);
        if (seenValues.has(basicValue)) {
          return false;
        }
        seenValues.add(basicValue);
        return true;
      });
    },
    {
      args: [AT.any],
      allowSqrlObjects: true,
      allowNull: true,
      argstring: "list",
      docstring: "Removes duplicate entries from a list"
    }
  );

  registry.save(
    function sort(arr) {
      if (!Array.isArray(arr)) {
        return null;
      } else if (arr.length === 0) {
        return [];
      }

      const basic = new WeakMap();
      arr.forEach(v => {
        basic[v] = SqrlObject.ensureBasic(v);
      });

      const type = typeof basic[arr[0]];

      invariant(
        arr.every(val => typeof basic[val] === type),
        "Every value in the array must be of the same type"
      );

      if (type === "string") {
        return [...arr].sort((a, b) => {
          return basic[a].localeCompare(basic[b]);
        });
      } else if (type === "number") {
        return [...arr].sort((a, b) => {
          return basic[a] - basic[b];
        });
      } else {
        throw new Error("Sort of the given type is not implemented");
      }
    },
    {
      args: [AT.any],
      allowSqrlObjects: true,
      argstring: "list",
      docstring: "Returns the provided list in sorted order"
    }
  );

  registry.save(
    function _flatten(array) {
      if (!array) {
        return null;
      }

      invariant(Array.isArray(array), `Invalid array received:: ${array}`);

      const filtered = array.filter(a => a);
      invariant(
        filtered.every((f?) => Array.isArray(f)),
        "every element must be an array"
      );

      const values = flatten(filtered);
      if (values.length && values.every((v?) => v === null)) {
        return null;
      }
      return values.filter((v?) => v !== null);
    },
    {
      name: "flatten",
      allowNull: true,
      argstring: "list",
      docstring: "Reduces multiple levels of lists into a single flat list"
    }
  );

  registry.save(
    function filter(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      return arr.filter(value => SqrlObject.isTruthy(value));
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.any],
      argstring: "list",
      docstring: "Removes any falsy values from the given list"
    }
  );

  registry.save(
    function first(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      return arr.length ? arr[0] : null;
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.any],
      argstring: "list",
      docstring: "Returns the first item in the provided list"
    }
  );

  registry.save(
    function concat(...items) {
      if (items.every(i => typeof i === "string" || typeof i === "number")) {
        return items.join("");
      } else if (items.every(i => Array.isArray(i))) {
        return [].concat(...items);
      } else {
        throw new Error("Invalid values provided to function");
      }
    },
    {
      args: [AT.any, AT.any.repeated],
      argstring: "value, value...",
      docstring: "Concatenates the given arguments (strings or lists) together"
    }
  );

  registry.save(
    function join(arr, by) {
      if (!Array.isArray(arr) || typeof by !== "string") {
        return null;
      }
      return arr.join(by);
    },
    {
      args: [AT.any, AT.any],
      argstring: "list, string",
      docstring: "Joins the provided list together using a string"
    }
  );

  registry.save(
    function last(arr) {
      if (!Array.isArray(arr) || !arr.length) {
        return null;
      }
      return arr[arr.length - 1];
    },
    {
      allowNull: true,
      args: [AT.any],
      allowSqrlObjects: true,
      argstring: "list",
      docstring: "Returns the last item in the provided list"
    }
  );

  registry.save(
    function _contains(seq, value) {
      if (!_isStringOrArray(seq) || seq === null || value === null) {
        return null;
      }
      return seq.indexOf(value) > -1;
    },
    {
      allowNull: true,
      args: [AT.any, AT.any],
      pure: true,
      argstring: "list | string, value",
      docstring:
        "Tests if a given list or string contains the provided search value"
    }
  );

  registry.save(
    function index(state, seq, index) {
      if (Array.isArray(seq)) {
        return index >= seq.length ? null : seq[index];
      } else if (typeof seq === "string") {
        return index >= seq.length ? null : seq.charAt(index);
      } else {
        return null;
      }
    },
    {
      allowNull: true,
      args: [AT.state, AT.any, AT.any.number],
      argstring: "list, index",
      docstring: "Returns the item at the specified index in a list"
    }
  );

  registry.save(
    function length(seq) {
      if (!_isStringOrArray(seq)) {
        return null;
      }
      return seq.length;
    },
    {
      args: [AT.any],
      argstring: "list",
      docstring: "Returns the length of a provided list"
    }
  );
}
