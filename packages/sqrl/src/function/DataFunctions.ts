/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./Instance";
import { Ast } from "../ast/Ast";

import { AstTypes as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import { SqrlObject } from "../object/SqrlObject";

import { sqrlInvariant } from "../api/parse";

export function registerDataFunctions(instance: StdlibRegistry) {
  instance.save(
    function attr(data: any, key: string | number): any {
      if (data instanceof SqrlObject) {
        data = data.getBasicValue();
      }
      key = SqrlObject.ensureBasic(key);
      if (
        data === null ||
        typeof data !== "object" ||
        (typeof key !== "string" && typeof key !== "number") ||
        !data.hasOwnProperty(key)
      ) {
        return null;
      } else {
        return data[key];
      }
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.any, AT.any],
      argstring: "object, key",
      docstring: "Returns the given attribute off the data",
    }
  );

  instance.save(
    function hasAttr(data, key) {
      if (
        data === null ||
        typeof data !== "object" ||
        (typeof key !== "string" && typeof key !== "number")
      ) {
        return null;
      }
      return data.hasOwnProperty(key);
    },
    {
      allowNull: true,
      args: [AT.any, AT.any],
      argstring: "object, key",
      docstring: "Returns true if the given attribute is set on the data",
    }
  );

  instance.save(
    function keys(data) {
      if (data === null || typeof data !== "object") {
        return null;
      } else {
        return Object.keys(data);
      }
    },
    {
      args: [AT.any],
      argstring: "object",
      docstring: "Returns a list of all the keys in the given object",
    }
  );

  instance.save(
    function jsonParse(raw: string) {
      return JSON.parse(raw);
    },
    {
      args: [AT.any.string],
      argstring: "string",
      docstring: "Parses the provided JSON encoded string",
    }
  );

  instance.save(
    function jsonStringify(obj: any) {
      return JSON.stringify(obj);
    },
    {
      args: [AT.any],
      argstring: "any",
      docstring: "Returns the argument as a JSON encoded string",
    }
  );

  instance.save(
    function _createMap(...items) {
      const result = {};
      for (let idx = 0; idx < items.length; idx += 2) {
        result[SqrlObject.ensureBasic(items[idx])] = items[idx + 1];
      }
      return result;
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      pure: true,
    }
  );

  instance.save(null, {
    name: "createMap",
    transformAst(state, ast): Ast {
      sqrlInvariant(
        ast,
        ast.args.length % 2 === 0,
        "Expected even number of arguments"
      );
      return SqrlAst.call("_createMap", ast.args);
    },
    pure: true,
    argstring: "key, value, (key, value)...",
    docstring: "Create a map given the key, value pairs",
  });

  instance.save(
    function mergeMaps(...objects) {
      return Object.assign({}, ...objects);
    },
    {
      allowSqrlObjects: true,
      argstring: "map, map...",
      docstring: "Merges the given maps together",
    }
  );
}
