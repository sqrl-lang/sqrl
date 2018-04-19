/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { default as AT } from "./AstTypes";
import SqrlAst from "./SqrlAst";

import invariant from "../jslib/invariant";
import {
  ListComprehensionAst,
  Ast,
  PriorityAst,
  CallAst,
  FeatureAst,
  RuleAst,
  SwitchAst
} from "./Ast";
import { SqrlParserState } from "../compile/SqrlParserState";
import { sqrlInvariant } from "../api/parse";

function invariantCb(condition, cb: () => string) {
  if (condition) {
    return;
  }
  throw new Error(cb());
}

const ignoreTypes = [
  "addRelationArgs",
  "aliasFeature",
  "constant",
  "include",
  "importFeatures",
  "importRules",
  "iterator",
  "load",
  "noop",
  "slot",
  "state",
  "value",
  "verdict_side_effect",
  "whenContext"
];

const entriesToObj = (o, [k, v]) => Object.assign(o, { [k]: v });
const pluralize = (text, count) =>
  `${count} ${text}` + (count === 1 ? "" : "s");

export default class SqrlAstTransformer {
  transformCase;
  transformers;

  constructor(private state: SqrlParserState) {
    this.transformCase = this.transformProps.bind(this, ["expr", "where"]);
    this.transformers = {
      assert: this.transformProps.bind(this, ["expr"]),
      binary_expr: this.transformProps.bind(this, ["left", "right"]),
      boolean_expr: this.transformProps.bind(this, ["left", "right"]),
      call: this.call.bind(this),
      feature: this.feature.bind(this),
      if: this.if.bind(this),
      label_side_effect: this.transformProps.bind(this, ["where", "features"]),
      let: this.transformProps.bind(this, ["expr", "where"]),
      list: this.transformProps.bind(this, ["exprs"]),
      listComprehension: this.listComprehension.bind(this),
      not: this.transformProps.bind(this, ["expr"]),
      registeredCall: this.call.bind(this),
      rule: this.rule.bind(this),
      rules: this.transformProps.bind(this, ["rules"]),
      save: this.transformProps.bind(this, ["features"]),
      saveRelation: this.transformProps.bind(this, ["args"]),
      script: this.transformProps.bind(this, ["statements"]),
      switch: this.switch.bind(this),
      when: this.transformProps.bind(this, ["rules", "statements"]),
      priority: this.priority.bind(this)
    };
    for (const type of ignoreTypes) {
      this.transformers[type] = (ast: Ast) => ast;
    }
  }

  assertArgs(ast: CallAst) {
    const { functionRegistry } = this.state;
    const props = functionRegistry.getProps(ast.func);

    // @TODO remove argCount
    // if args is specified with no argCount, ensure that we've provided a type for every arg
    if (props.argCount) {
      const hasStateArg = ast.args[0] && ast.args[0].type === "state";
      const argCount =
        props.argCount + (props.stateArg && !hasStateArg ? -1 : 0);
      sqrlInvariant(
        ast,
        argCount === ast.args.length,
        `Argument count to call of ${ast.func} did not match. ` +
          `Expected ${pluralize("argument", argCount)} but got ${
            ast.args.length
          }.`
      );
    }

    if (props.args) {
      AT.compileTypesInvariant(ast, props.args);
    }
  }

  call(ast: CallAst) {
    const { functionRegistry } = this.state;

    const hasFunction = functionRegistry.has(ast.func);

    sqrlInvariant(ast, hasFunction, "Function not found: " + ast.func);
    const props = functionRegistry.getProps(ast.func);

    const isPrivate = ast.func.startsWith("_");
    if (isPrivate && ast.hasOwnProperty("location")) {
      // Given `ast` will have a location if it was user specified
      sqrlInvariant(
        ast,
        this.state.allowPrivate,
        "Function names cannot start with an underscore"
      );
    }

    if (props.transformAst) {
      // If a transformAst is defined do the argument count check before transform
      this.assertArgs(ast);

      const originalFunc = ast.func;
      const transformed = props.transformAst(this.state, ast);
      if (transformed.type !== "call") {
        return this.transform(transformed);
      }
      invariant(
        transformed.func !== originalFunc,
        "transformed func must have a different name: %s",
        transformed.func
      );
      return this.transform(transformed);
    }

    // If we need state / when context arguments add them automatically
    if (props.stateArg) {
      const astArgs: Ast[] = [...ast.args];

      if (props.whenContextArg) {
        // Remove any state arguments before checking the whenContext
        if (astArgs.length > 0 && astArgs[0].type === "state") {
          astArgs.shift();
        }

        if (astArgs.length === 0 || astArgs[0].type !== "whenContext") {
          astArgs.unshift({
            type: "whenContext"
          });
        }
      }

      if (astArgs.length === 0 || astArgs[0].type !== "state") {
        astArgs.unshift({
          type: "state"
        });
      }

      ast = Object.assign({}, ast, {
        args: astArgs
      });
    }

    this.assertArgs(ast);

    if (ast.args) {
      const args = ast.args.map((arg, idx) => {
        invariantCb(
          arg,
          () =>
            `Cannot transform ast type:: arg ${idx} is undefined:: ${
              ast.type
            } ${JSON.stringify(props)} ${JSON.stringify(
              SqrlAst.removeLocation(ast)
            )}`
        );
        return this.transform(arg);
      });

      if (props.pure) {
        const allConstant = args.every(arg => arg.type === "constant");
        if (allConstant) {
          return {
            type: "constant",
            value: this.state.functionRegistry.pureFunction[ast.func](
              ...args.map(arg => arg.value)
            )
          };
        }
      }

      ast = Object.assign({}, ast, {
        args
      });
    }

    return ast;
  }

  feature(ast: FeatureAst) {
    const dotIndex = ast.value.indexOf(".");
    if (dotIndex >= 0) {
      return this.transform(
        SqrlAst.call("_fetchGraphChild", [
          SqrlAst.feature(ast.value.substring(0, dotIndex)),
          SqrlAst.constant(ast.value.substring(dotIndex + 1))
        ])
      );
    }

    return ast;
  }

  priority(ast: PriorityAst): Ast {
    return ast.expr;
  }

  if(ast) {
    const props = ast.exprs
      ? ["exprs"]
      : ["condition", "trueBranch", "falseBranch"];
    return this.transformProps(props, ast);
  }

  listComprehension(ast: ListComprehensionAst): ListComprehensionAst {
    this.state.ensureIterator(ast.iterator, ast.iterator.name);
    return this.state.wrapIterator(ast.iterator.name, () => {
      return this.transformProps(["output", "input", "iterator", "where"], ast);
    });
  }

  rule(ast: RuleAst) {
    const props = ast.where ? ["where"] : ["feature"];
    return this.transformProps(props, ast);
  }

  switch(ast: SwitchAst) {
    return Object.assign({}, ast, {
      cases: ast.cases.map(this.transformCase),
      defaultCase: this.transform(this.transform(ast.defaultCase))
    });
  }

  transformProps(props, ast: Ast) {
    const transformed = props
      .map(k => {
        invariantCb(
          ast[k],
          () =>
            `Cannot transform ast type: ${
              ast.type
            } ${props} ${SqrlAst.removeLocation(ast)}`
        );
        return [k, this.transform(ast[k])];
      })
      .reduce(entriesToObj, {});

    return Object.assign({}, ast, transformed);
  }

  transform(ast: Ast) {
    if (Array.isArray(ast)) {
      return ast.map(a => this.transform(a));
    }
    const transformer = this.transformers[ast.type];
    invariantCb(
      transformer,
      () =>
        `Cannot transform ast type: ${ast.type} ${SqrlAst.removeLocation(ast)}`
    );
    return transformer(ast);
  }
}
