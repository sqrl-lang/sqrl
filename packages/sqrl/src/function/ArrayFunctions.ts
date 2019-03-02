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

function tryEnsureNumberArray(arr?) {
  if (!Array.isArray(arr)) {
    return null;
  }
  return arr.filter((value?) => typeof value === "number");
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
    function sortList(arr) {
      if (!Array.isArray(arr)) {
        return null;
      }
      const basic = new WeakMap();
      arr.forEach(v => {
        basic[v] = SqrlObject.ensureBasic(v);
      });

      return [...arr].sort((a, b) => {
        return basic[a] - basic[b];
      });
    },
    {
      args: [AT.any],
      allowSqrlObjects: true,
      argstring: "list",
      docstring: "Returns the provided list in sorted order"
    }
  );

  registry.save(
    function concatLists(...arrays) {
      const values = [].concat(...arrays);
      if (values.length && values.every((v?) => v === null)) {
        return [];
      }
      return values.filter((v?) => v !== null);
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      argstring: "list, list...",
      docstring: "Concatenates many lists into a single long list"
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
      docstring: "Reducess multiple levels of lists into a single flat list"
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
    function listSum(arr) {
      const values = tryEnsureNumberArray(arr);
      return values.reduce((a, b) => a + b, 0);
    },
    {
      allowNull: true,
      args: [AT.any],
      argstring: "list",
      docstring: "Returns the sum of all items in the list"
    }
  );

  registry.save(
    function listMin(arr) {
      const values = tryEnsureNumberArray(arr);
      return values && values.length ? Math.min(...values) : null;
    },
    {
      allowNull: true,
      args: [AT.any],
      argstring: "list",
      docstring: "Returns the minimum of all items in the list"
    }
  );

  registry.save(
    function listMax(arr) {
      const values = tryEnsureNumberArray(arr);
      return values && values.length ? Math.max(...values) : null;
    },
    {
      allowNull: true,
      args: [AT.any],
      argstring: "list",
      docstring: "Returns the maximum of all items in the list"
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
      if (!Array.isArray(seq) || typeof index !== "number") {
        return null;
      }
      return index >= seq.length ? null : seq[index];
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.array, AT.any.number],
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
