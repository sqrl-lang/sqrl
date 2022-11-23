/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  AT,
  Instance,
  CompileState,
  Ast,
  AstBuilder,
  sqrlInvariant,
} from "sqrl";
import { registerPatternFunctions } from "./PatternFunctions";
import {
  InProcessPatternService,
  CreateRegExp,
} from "./InProcessPatternService";
import { SimHash } from "simhash-js";
import { createHash } from "crypto";

export function registerWithEngine(
  instance: Instance,
  createRegExp: CreateRegExp
) {
  const jsSimhash = new SimHash();

  instance.registerSync(
    function sha256(data: Buffer | string): string {
      const hasher = createHash("sha256");
      if (data instanceof Buffer) {
        hasher.update(data);
      } else {
        hasher.update(data, "utf8");
      }
      return hasher.digest("hex");
    },
    {
      args: [AT.any],
      pure: true,
      argstring: "value",
      docstring: "Returns the sha256 hash of the given value as hex",
    }
  );

  instance.registerSync(
    function simhash(text: string) {
      const hashHex: string = jsSimhash.hash(text).toString(16);
      return hashHex.padStart(8, "0");
    },
    {
      args: [AT.any.string],
      argstring: "text",
      docstring: "Return the simhash of the given text",
    }
  );

  instance.registerSync(
    function _charGrams(string, gramSize) {
      const grams = [];
      for (let i = 0; i <= string.length - gramSize; i++) {
        grams.push(string.substr(i, gramSize));
      }
      return grams;
    },
    {
      args: [AT.any.string, AT.constant.number],
    }
  );
  instance.registerTransform(
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
      args: [AT.any, AT.constant.number],
      argstring: "text, size",
      docstring: "Returns all the chargrams of a given size from the text",
    }
  );

  instance.registerSync(
    function regexMatch(state, regex, string) {
      return string.match(new RegExp(regex, "g"));
    },
    {
      args: [AT.state, AT.any.string, AT.any.string],
      argstring: "regex, string",
      docstring:
        "Returns the matches of the given regular expression against the string",
    }
  );

  instance.registerSync(
    function regexTest(state, regex, string) {
      return new RegExp(regex, "g").test(string);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string],
      argstring: "regex, string",
      docstring:
        "Returns true if the given regular expression matches the string",
    }
  );

  instance.registerSync(
    function regexReplace(state, regex, replacement, string) {
      return string.replace(new RegExp(regex, "g"), replacement);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string, AT.any],
      argstring: "regex, replacement, string",
      docstring:
        "Replaces each match of the given regular expression in the string",
    }
  );

  const RE_EMAIL = new RegExp("[^\\d\\w]+", "ig");

  instance.registerSync(
    function normalizeEmail(state, email: string) {
      const [handle, domain] = email.toLowerCase().split("@", 2);
      return handle.split("+")[0].replace(RE_EMAIL, "") + "@" + domain;
    },
    {
      args: [AT.state, AT.any.string],
      argstring: "email",
      docstring: "Returns the normalized form of the given email address",
    }
  );

  registerPatternFunctions(instance, new InProcessPatternService(createRegExp));
}
