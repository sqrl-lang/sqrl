/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  AT,
  FunctionRegistry,
  CompileState,
  Ast,
  AstBuilder,
  sqrlInvariant
} from "sqrl";
import { registerPatternFunctions } from "./PatternFunctions";
import { InProcessPatternService } from "./InProcessPatternService";
import { SimHash } from "simhash-js";

export function register(registry: FunctionRegistry) {
  const jsSimhash = new SimHash();
  registry.registerSync(function simhash(text: string) {
    const hashHex: string = jsSimhash.hash(text).toString(16);
    return hashHex.padStart(8, "0");
  });

  registry.registerSync(
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
  registry.registerTransform(
    function charGrams(state: CompileState, ast): Ast {
      const sizeAst = ast.args[1];
      sqrlInvariant(
        ast,
        sizeAst.type === "constant" && sizeAst.value > 0,
        "charGrams size must be > 0"
      );
      return AstBuilder.call("_charGrams", ast.args);
    },
    {
      args: [AT.any, AT.constant.number]
    }
  );

  // TODO: could precompile these regexes at parse time
  registry.registerSync(
    function regexMatch(state, regex, string) {
      return string.match(new RegExp(regex, "g"));
    },
    {
      args: [AT.state, AT.any.string, AT.any.string]
    }
  );

  registry.registerSync(
    function regexTest(state, regex, string) {
      return new RegExp(regex, "g").test(string);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string]
    }
  );

  registry.registerSync(
    function regexReplace(state, regex, string, replaceWith) {
      return string.replace(new RegExp(regex, "g"), replaceWith);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string, AT.any]
    }
  );

  const RE_EMAIL = new RegExp("[^\\d\\w]+", "ig");

  registry.registerSync(
    function normalizeEmail(state, email: string) {
      const [handle, domain] = email.toLowerCase().split("@", 2);
      return handle.split("+")[0].replace(RE_EMAIL, "") + "@" + domain;
    },
    {
      args: [AT.state, AT.any.string]
    }
  );

  registerPatternFunctions(registry, new InProcessPatternService());
}
