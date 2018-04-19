/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/* eslint-disable no-useless-escape */

import FunctionRegistry from "./FunctionRegistry";
import { default as AT } from "../ast/AstTypes";
import { SqrlParserState } from "../compile/SqrlParserState";
import { CallAst, Ast } from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import { sqrlInvariant } from "../api/parse";
import SqrlObject from "../object/SqrlObject";

export function registerStringFunctions(registry: FunctionRegistry) {
  registry.save(function concat(...strings) {
    for (const string of strings) {
      if (typeof string !== "string" && typeof string !== "number") {
        return null;
      }
    }
    return strings.join("");
  }, {});

  registry.save(
    function stringify(value) {
      return JSON.stringify(value);
    },
    {
      argCount: 1
    }
  );
  registry.save(
    function hexEncode(string) {
      return Buffer.from(string, "utf-8").toString("hex");
    },
    {
      argCount: 1
    }
  );

  registry.save(
    function strip(state, string) {
      return typeof string === "string" ? string.trim() : null;
    },
    {
      args: [AT.state, AT.any.string]
    }
  );

  registry.save(
    function _encodeURIComponent(state, string) {
      return encodeURIComponent(string);
    },
    {
      name: "encodeURIComponent",
      args: [AT.state, AT.any.string]
    }
  );

  registry.save(
    function split(string, by) {
      if (typeof string !== "string" || typeof by !== "string") {
        return null;
      }
      return string.split(by);
    },
    {
      argCount: 2
    }
  );

  registry.save(
    function charLength(string) {
      return typeof string === "string" ? string.length : null;
    },
    {
      argCount: 1
    }
  );

  registry.save(
    function charAt(string, index: number) {
      if (typeof string !== "string" || typeof index !== "number") {
        return null;
      }
      return string.charAt(index) || null;
    },
    {
      argCount: 2
    }
  );

  registry.save(
    function iso8601(value) {
      if (value instanceof SqrlObject) {
        const timeMs = value.getTimeMs();
        return new Date(timeMs).toISOString();
      }
      throw new Error("Unsupported date type");
    },
    {
      argCount: 1,
      allowSqrlObjects: true
    }
  );

  registry.save(
    function lower(string) {
      return typeof string === "string" ? string.toLowerCase() : null;
    },
    {
      argCount: 1
    }
  );
  registry.save(
    function upper(string) {
      return typeof string === "string" ? string.toUpperCase() : null;
    },
    {
      argCount: 1
    }
  );
  registry.save(
    function hasNumber(string) {
      return typeof string === "string" ? /[0-9]/.test(string) : null;
    },
    {
      argCount: 1
    }
  );

  registry.save(
    function startsWith(string, prefix) {
      if (typeof string !== "string" || typeof prefix !== "string") {
        return null;
      }
      return string.startsWith(prefix);
    },
    {
      argCount: 2
    }
  );
  registry.save(
    function endsWith(string, suffix) {
      if (typeof string !== "string" || typeof suffix !== "string") {
        return null;
      }
      return string.endsWith(suffix);
    },
    {
      argCount: 2
    }
  );

  registry.save(
    function _substr(state, string, start, end = null) {
      return string.substr(...[start, end].filter(v => v !== null));
    },
    {
      name: "substr",
      args: [AT.state, AT.any.string, AT.any.number, AT.any.optional.number]
    }
  );

  registry.save(null, {
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const [stringAst, optionsAst] = ast.args;
      const args = [
        stringAst,
        SqrlAst.call("regexReplace", [
          stringAst,
          SqrlAst.constant("/[^a-zA-Z]/ig"),
          SqrlAst.constant("")
        ])
      ];

      if (optionsAst) {
        args.push(optionsAst);
      }

      return SqrlAst.call("_isGibberish", args);
    },
    args: [AT.any, AT.any.optional],
    name: "isGibberish"
  });

  registry.save(
    function _charGrams(string, gramSize) {
      const grams = [];
      for (let i = 0; i <= string.length - gramSize; i++) {
        grams.push(string.substr(i, gramSize));
      }
      return grams;
    },
    {
      args: [AT.any.string, AT.constant.number]
    }
  );
  registry.save(null, {
    name: "charGrams",
    args: [AT.any, AT.constant.number],
    transformAst(state: SqrlParserState, ast): Ast {
      const sizeAst = ast.args[1];
      sqrlInvariant(
        ast,
        sizeAst.type === "constant" && sizeAst.value > 0,
        "charGrams size must be > 0"
      );
      return SqrlAst.call("_charGrams", ast.args);
    }
  });

  registry.save(
    function escapeRegex(state, str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },
    {
      args: [AT.state, AT.any.string]
    }
  );

  // TODO: could precompile these regexes at parse time
  registry.save(
    function regexMatch(state, string, regex) {
      return string.match(new RegExp(regex, "g"));
    },
    {
      args: [AT.state, AT.any.string, AT.any.string]
    }
  );

  registry.save(
    function regexTest(state, string, regex) {
      return new RegExp(regex, "g").test(string);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string]
    }
  );

  registry.save(
    function regexReplace(state, string, regex, replaceWith) {
      return string.replace(new RegExp(regex, "g"), replaceWith);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string, AT.any]
    }
  );

  registry.save(
    function urlEncode(string) {
      return encodeURIComponent(string);
    },
    {
      args: [AT.any],
      pure: true
    }
  );

  const RE_EMAIL = new RegExp("[^\\d\\w]+", "ig");

  // TODO: This could be improved *a lot*.
  registry.save(
    function normalizeEmail(state, email: string) {
      const [handle, domain] = email.toLowerCase().split("@", 2);
      return handle.split("+")[0].replace(RE_EMAIL, "") + "@" + domain;
    },
    {
      args: [AT.state, AT.any.string]
    }
  );
}
