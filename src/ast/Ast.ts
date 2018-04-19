/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import stringify = require("fast-stable-stringify");
import { isValidFeatureName } from "../feature/FeatureName";
import { Ast } from "../api/ast";
export * from "../api/ast";

const recurseFields: { [astType: string]: string[] } = {};
const jsonFields: { [astType: string]: string[] } = {};
const skipFields = ["location", "json"];

recurseFields.constant = [];
jsonFields.constant = ["value"];

recurseFields.repl = ["statements"];
jsonFields.repl = [];

recurseFields.script = ["statements"];
jsonFields.script = [];

recurseFields.switch = ["cases", "defaultCase"];
jsonFields.switch = [];

recurseFields.switchCase = ["ast", "expr", "where", "truthTableWhere"];
jsonFields.switchCase = [];

recurseFields.noop = [];
jsonFields.noop = [];

recurseFields.listComprehension = ["output", "input", "iterator", "where"];
jsonFields.listComprehension = [];

recurseFields.let = ["expr", "where"];
jsonFields.let = ["description", "feature", "final", "isDefaultCase"];

recurseFields.execute = [];
jsonFields.execute = ["repeat", "skipWait"];

recurseFields.priority = ["expr"];
jsonFields.priority = ["priority"];

recurseFields.assert = ["expr"];
jsonFields.assert = [];

recurseFields.include = ["where"];
jsonFields.include = ["filename"];

recurseFields.expr = ["expr"];
jsonFields.expr = [];

recurseFields["binary_expr"] = ["left", "right"];
recurseFields["boolean_expr"] = ["left", "right"];

jsonFields["binary_expr"] = ["operator"];
jsonFields["boolean_expr"] = ["operator"];

recurseFields.feature = [];
jsonFields.feature = ["value"];

recurseFields.aliasFeature = [];
jsonFields.aliasFeature = ["value", "alias"];

recurseFields.countArgs = ["sumFeature", "features"];
jsonFields.countArgs = ["timespan"];

recurseFields.rules = ["rules"];
jsonFields.rules = [];

recurseFields.rule = ["where"];
jsonFields.rule = [
  "alias",
  "eager",
  "feature",
  "name",
  "reason",
  "sync",
  "rolloutPercent"
];
recurseFields.list = ["exprs"];
jsonFields.list = [];

recurseFields.percentileArgs = [];
jsonFields.percentileArgs = ["groupFeatures"];

recurseFields.rateLimitArgs = ["tokenAmount"];
jsonFields.rateLimitArgs = [
  "features",
  "maxAmount",
  "refillTimeMs",
  "refillAmount",
  "strict"
];

recurseFields.countUniqueArgs = [];
jsonFields.countUniqueArgs = [
  "uniques",
  "groups",
  "setOperation",
  "windowMs",
  "beforeAction"
];

recurseFields.trendingArgs = [];
jsonFields.trendingArgs = ["minEvents", "features", "timespan"];

recurseFields.call = ["args"];
jsonFields.call = ["func"];

recurseFields.registeredCall = ["args"];
jsonFields.registeredCall = ["func"];

recurseFields.if = ["condition", "trueBranch", "falseBranch"];
jsonFields.if = [];

recurseFields.state = [];
jsonFields.state = [];

recurseFields.whenContext = [];
jsonFields.whenContext = ["slotName"];

recurseFields.streamingStatArgs = [];
jsonFields.streamingStatArgs = ["feature", "group"];

recurseFields.not = ["expr"];
jsonFields.not = [];

recurseFields.slot = [];
jsonFields.slot = ["slotName"];

recurseFields.iterator = [];
jsonFields.iterator = ["name"];

recurseFields.when = ["rules", "statements"];
jsonFields.when = [];

function mapFields(source: Ast, fields: string[], callback: (Ast) => Ast): Ast {
  /***
   * This is responsible for running the callback on all the children fields. It's smart in that
   * if no changes are made it returns the source object.
   */
  let changed = false;
  const out = {};
  fields.forEach(field => {
    if (source.hasOwnProperty(field) && source[field] !== null) {
      if (Array.isArray(source[field])) {
        out[field] = source[field].map(entry => {
          const rv = mapAst(entry, callback);
          changed = changed || rv !== entry;
          return rv;
        });
      } else {
        out[field] = mapAst(source[field], callback);
        changed = changed || out[field] !== source[field];
      }
    }
  });

  if (changed) {
    return Object.assign({}, source, out);
  } else {
    return source;
  }
}

function walkFields(
  source: Ast,
  fields: string[],
  callback: (Ast) => void
): void {
  fields.forEach(field => {
    if (source.hasOwnProperty(field) && source[field] !== null) {
      if (Array.isArray(source[field])) {
        source[field].forEach(entry => {
          walkAst(entry, callback);
        });
      } else {
        walkAst(source[field], callback);
      }
    }
  });
}

/***
 * jsonAst converts an Ast to a reproducable buffer of JSON data
 */
export function jsonAst(ast: Ast): Buffer {
  if (ast.json) {
    return ast.json;
  }

  // Start with the type
  const rv = [Buffer.from(`{"type":"${ast.type}"`)];

  recurseFields[ast.type].forEach(field => {
    if (ast.hasOwnProperty(field) && ast[field] !== null) {
      const value = ast[field];
      if (Array.isArray(value)) {
        if (!value.length) {
          rv.push(Buffer.from(`,"${field}":[]`));
        } else {
          rv.push(Buffer.from(`,"${field}":[`));
          rv.push(jsonAst(value[0]));
          for (let idx = 1; idx < value.length; idx++) {
            rv.push(Buffer.from(","));
            rv.push(jsonAst(value[idx]));
          }
          rv.push(Buffer.from("]"));
        }
      } else {
        rv.push(Buffer.from(`,"${field}":`));
        rv.push(jsonAst(value));
      }
    }
  });

  jsonFields[ast.type].forEach(field => {
    if (ast.hasOwnProperty(field)) {
      rv.push(Buffer.from(`,"${field}":${stringify(ast[field])}`));
    }
  });

  // @TODO: In some future this could be removed, but for now (and safety!) it should be here
  Object.keys(ast).forEach(key => {
    if (
      !skipFields.includes(key) &&
      !jsonFields[ast.type].includes(key) &&
      !recurseFields[ast.type].includes(key)
    ) {
      if (key !== "type") {
        throw new Error("Unserialized key on " + ast.type + ": " + key);
      }
    }
  });

  rv.push(Buffer.from("}"));

  ast.json = Buffer.concat(rv);
  return ast.json;
}

/***
 * mapAst runs an entire ast through a mapCallback.
 *
 * It first runs all the children fields, and then calls the callback on the ast itself
 */
export function mapAst(ast: Ast, mapCallback: (node: Ast) => Ast): Ast {
  if (recurseFields.hasOwnProperty(ast.type)) {
    ast = mapFields(ast, recurseFields[ast.type], mapCallback);
  } else {
    throw new Error("mapAst not defined for: " + ast.type);
  }
  return mapCallback(ast);
}

/***
 * walkAst walks through an entire ast (similar to mapAst but no returned values)
 */
export function walkAst(ast: Ast, walkCallback: (node: Ast) => void): void {
  if (recurseFields.hasOwnProperty(ast.type)) {
    walkFields(ast, recurseFields[ast.type], walkCallback);
  } else {
    throw new Error("walkAst not defined for: " + ast.type);
  }
  walkCallback(ast);
}

export function astSlotNames(root: Ast): string[] {
  const slotNames = new Set();
  walkAst(root, ast => {
    if (ast.type === "feature") {
      slotNames.add(ast.value);
    } else if (ast.type === "aliasFeature") {
      slotNames.add(ast.value);
    } else if (ast.type === "slot") {
      slotNames.add(ast.slotName);
    }
  });
  return Array.from(slotNames);
}

export function extractAstFeatures(root: Ast): string[] {
  return astSlotNames(root).filter(name => isValidFeatureName(name));
}
