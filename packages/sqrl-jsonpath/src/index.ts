/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as JSONPath from "jsonpath";

import {
  Instance,
  CompileState,
  Ast,
  AT,
  sqrlInvariant,
  AstBuilder,
  Execution,
} from "sqrl";

// $[ (digits / single quoted string / double quoted string) ] (anything)
const JSON_BRAKET_REGEX =
  /^\$\[([0-9]+|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\](.*)$/;

export function register(instance: Instance) {
  instance.registerTransform(
    function jsonValue(state: CompileState, ast): Ast {
      const pathAst = ast.args[1];
      if (pathAst.type !== "constant") {
        throw new Error("Expected constant");
      }
      const fullPath = pathAst.value;

      // @TODO: At some point in the future we should try handle the full
      // JSONPath spec. I'm hesitent to use libraries though since they'll be a
      // bit slower and implementations might change when we rewrite our core.
      let path = fullPath;
      let result = ast.args[0];
      while (path !== "$") {
        // See if we can find something to select, throw if not
        let select = null;
        if (path.startsWith("$.")) {
          const match = /^\$\.([$_a-zA-Z][$_a-zA-Z0-9]*)(.*?)$/.exec(path);
          if (match) {
            select = match[1];
            path = "$" + match[2];
          }
        } else if (path.startsWith("$[")) {
          const match = JSON_BRAKET_REGEX.exec(path);
          if (match) {
            select = match[1];
            path = "$" + match[2];

            // If we matched a quoted string, remove escaping
            if (select.startsWith("'") || select.startsWith('"')) {
              select = select.substring(1, select.length - 1);
              select = select.replace(/\\(.)/, "$1");
            }
          }
        }

        sqrlInvariant(ast, select, "JSONPath is not supported:: %s", fullPath);
        result = AstBuilder.call("attr", [result, AstBuilder.constant(select)]);
      }
      return result;
    },
    {
      args: [AT.any, AT.constant.string],
      argstring: "object, path string",
      docstring: "Returns the value at the given path in the JSON object",
    }
  );

  instance.registerSync(
    function jsonPath(state: Execution, data: any, path: string): any {
      /**
       * @todo: There is a hard to track down bug that is causing this to
       * require the serialization, deserialization.
       *
       * This function should just be:
       *  return jsonpathQuery(data, path);
       */
      const stringified = JSON.stringify(data);
      return JSONPath.query(JSON.parse(stringified), path);
    },
    {
      args: [AT.state, AT.any, AT.constant.string],
      argstring: "object, path string",
      docstring: "Returns the values matching the given JSONPath query",
    }
  );
}
