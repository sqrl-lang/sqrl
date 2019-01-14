/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "../jslib/invariant";
import murmurhash = require("murmurhash-native");

import { SqrlSlot } from "../slot/SqrlSlot";
import {
  Ast,
  CallAst,
  ConstantAst,
  FeatureAst,
  ListAst,
  AstLocation,
  LetAst,
  NoopAst,
  mapAst,
  SlotAst,
  jsonAst,
  NotAst,
  BinaryExprAst,
  IncludeAst
} from "./Ast";
import { SqrlObject } from "../object/SqrlObject";
import { AstBuilder } from "../api/AstBuilder";

function invariantAst(ast: Ast): void {
  invariant(
    typeof ast === "object" && typeof ast.type === "string",
    "Expected an AST node"
  );
}

const noop: NoopAst = {
  type: "noop"
};

const SqrlAst = {
  SqrlSlot,

  featureEquals(feature: string, val: any): BinaryExprAst {
    return {
      type: "binary_expr",
      left: SqrlAst.feature(feature),
      operator: "=",
      right: SqrlAst.constant(val)
    };
  },

  letStatement(
    feature: string,
    expr: Ast,
    options: {
      /* @TODO: add used options */
    } = {}
  ): LetAst {
    const rv: LetAst = {
      feature,
      expr,
      type: "let",
      where: SqrlAst.constant(true),
      final: false,
      description: null,
      isDefaultCase: false
    };
    Object.assign(rv, options);
    return rv;
  },

  removeLocation(input: Ast): Ast {
    return mapAst(input, ast => {
      if (ast.hasOwnProperty("location")) {
        const rv: Ast = Object.assign({}, ast);
        delete rv.location;
        return rv;
      }
      return ast;
    });
  },

  hash(ast: Ast): string {
    return murmurhash.murmurHash128x64(jsonAst(ast), 0, "hex");
  },

  areEqual(left: Ast, right: Ast): boolean {
    const lBuffer = jsonAst(left);
    const rBuffer = jsonAst(right);
    return (
      lBuffer.length === rBuffer.length &&
      Buffer.compare(lBuffer, rBuffer) === 0
    );
  },

  call(func: string, args: Ast[]): CallAst {
    invariant(
      args.every(
        (arg: Ast) => typeof arg === "object" && typeof arg.type === "string"
      ),
      "Expected every argument to a call to be an ast"
    );
    return { type: "call", func, args };
  },

  bool(ast: Ast): CallAst | ConstantAst {
    return SqrlAst.call("bool", [ast]);
  },

  and(...asts: Ast[]): Ast {
    asts.forEach(ast => invariantAst(ast));
    return AstBuilder.and(asts);
  },

  or(...asts: Ast[]): Ast {
    asts.forEach(ast => invariantAst(ast));
    return AstBuilder.or(asts);
  },

  not(ast: Ast): NotAst {
    return {
      type: "not",
      expr: ast
    };
  },

  areAllConstant(asts: Ast[]): asts is ConstantAst[] {
    return asts.every(ast => ast.type === "constant");
  },

  isExactConstant(ast: Ast, value: any): boolean {
    // Unwrap switch() statements with a single always-true case
    while (
      ast.type === "switch" &&
      ast.cases.length === 1 &&
      SqrlAst.isConstantTrue(ast.cases[0].where)
    ) {
      ast = ast.cases[0].expr;
    }

    return ast.type === "constant" && ast.value === value;
  },
  isConstantNull(ast: Ast): boolean {
    return SqrlAst.isExactConstant(ast, null);
  },
  isConstantTrue(ast: Ast): boolean {
    return SqrlAst.isExactConstant(ast, true);
  },
  isConstantFalse(ast: Ast): boolean {
    return SqrlAst.isExactConstant(ast, false);
  },
  isSimpleDataObject(ast: Ast): boolean {
    invariant(ast, "expected simple data object but got null");
    return (
      (ast.type === "constant" && typeof ast.value === "object") ||
      (ast.type === "call" &&
        ast.func === "dataObject" &&
        ast.args.length % 2 === 0) ||
      (ast.type === "call" &&
        ast.func === "_dataObject" &&
        ast.args.length % 2 === 0)
    );
  },
  constant(value: any): ConstantAst {
    return { type: "constant", value };
  },
  constants(...values: any[]): ConstantAst[] {
    return values.map(SqrlAst.constant);
  },
  list(...exprs: Ast[]): ListAst {
    return AstBuilder.list(exprs);
  },
  registerCall(ast) {
    invariant(ast.type === "call", "must be call");
    return Object.assign({}, ast, {
      type: "registeredCall"
    });
  },

  slotName(slotName: string): SlotAst {
    return {
      type: "slot",
      slotName
    };
  },

  include(filename: string): IncludeAst {
    return {
      type: "include",
      filename,
      where: SqrlAst.constant(true)
    };
  },

  slot(slot: SqrlSlot): SlotAst {
    invariant(slot instanceof SqrlSlot, "Expected SqrlSlot object");
    return {
      type: "slot",
      slotName: slot.name
    };
  },
  feature(name: string): FeatureAst {
    return { type: "feature", value: name };
  },
  features(...features: string[]): FeatureAst[] {
    return features.map(SqrlAst.feature);
  },
  props(obj) {
    invariant(typeof obj === "object", "Expected object for SqrlAst.props");
    return AstBuilder.props(obj);
  },
  branch(condition: Ast, trueBranch: Ast, falseBranch: Ast = null): Ast {
    falseBranch = falseBranch || SqrlAst.constant(null);
    if (condition.type === "constant") {
      return SqrlObject.isTruthy(condition.value) ? trueBranch : falseBranch;
    }
    return AstBuilder.branch(condition, trueBranch, falseBranch);
  },
  branchOrNull(condition: Ast, trueBranch: Ast) {
    return SqrlAst.branch(condition, trueBranch, SqrlAst.constant(null));
  },
  srcFileLineNumber(location: AstLocation): string {
    return `${location.filename || ""}:${location.start.line}`;
  },

  srcLine(location: AstLocation): string {
    return location.source.split("\n")[location.start.line - 1];
  },

  srcLines(locations: AstLocation[]): string {
    const filenames = locations.map(SqrlAst.srcFileLineNumber);
    const lines = locations.map(SqrlAst.srcLine);

    let table = "";
    for (let i = 0; i < filenames.length; i++) {
      table += filenames[i] + "  " + lines[i].trim();
    }
    return table;
  },

  noop
};

export default SqrlAst;
