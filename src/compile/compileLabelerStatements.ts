/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlAst from "../ast/SqrlAst";
import invariant from "../jslib/invariant";
import { Ast, ScriptAst } from "../ast/Ast";
import { SqrlParserState } from "./SqrlParserState";
import { compileWhenBlock } from "./compileWhenBlock";
import { sqrlInvariant, buildSqrlError } from "../api/parse";

const featuresToOrAst = (features): Ast => {
  invariant(features.length > 0, "Expected atleast one feature");
  const left: Ast = { type: "feature", value: features[0] };
  if (features.length === 1) {
    return left;
  } else {
    return {
      type: "boolean_expr",
      operator: "or",
      left,
      right: featuresToOrAst(features.slice(1))
    };
  }
};

function pushFile(parserState: SqrlParserState, ast: ScriptAst): void {
  for (const statement of ast.statements) {
    parserState.pushStatement(statement);
  }
}

export function labelerPushStatement(
  parserState: SqrlParserState,
  ast: Ast
): void {
  const functionRegistry = parserState.functionRegistry;

  sqrlInvariant(
    ast,
    ast.type !== "execute",
    "Execute statement is only valid in sqrl tests"
  );

  if (ast.type === "noop") {
    return;
  } else if (ast.type === "constant" && ast.value === null) {
    return;
  } else if (ast.type === "include") {
    const includeFiles = parserState.importer.getIncludeFiles(ast);

    parserState.usedFiles.add(ast.filename);

    parserState.wrapWhere(ast.where, () => {
      for (const includeFile of includeFiles) {
        parserState.wrapWhere(includeFile.where, () => {
          pushFile(parserState, includeFile.ast);
        });
      }
    });
  } else if (ast.type === "assert") {
    sqrlInvariant(
      ast,
      parserState.allowAssertions,
      "Assertions are only valid in sqrl tests"
    );
    parserState.pushStatement({
      type: "call",
      func: "assert",
      args: [ast.expr],
      location: ast.location
    });
  } else if (ast.type === "if") {
    let resultAst: Ast = ast;
    let conditionAst: Ast = SqrlAst.constant(true);

    while (resultAst.type === "if") {
      sqrlInvariant(
        resultAst,
        SqrlAst.isConstantNull(resultAst.falseBranch),
        "`if` statements cannot contain a false branch"
      );
      conditionAst = SqrlAst.and(conditionAst, resultAst.condition);
      resultAst = resultAst.trueBranch;
    }

    if (resultAst.type !== "call") {
      throw buildSqrlError(ast, "`if` statement true branch must be a `call`");
    }

    const func = resultAst.func;
    sqrlInvariant(
      ast,
      functionRegistry.isStatement(func),
      `Function '${func}' was not registered as a statement`
    );

    const statementFeature = functionRegistry.statementFeature(func);
    const registeredCall = SqrlAst.registerCall(resultAst);
    parserState.addStatement(
      ast,
      statementFeature,
      SqrlAst.branch(conditionAst, registeredCall)
    );
  } else if (ast.type === "call") {
    parserState.addCallStatement(ast, ast);
  } else if (ast.type === "listComprehension") {
    functionRegistry.assertStatementAst(ast.output);
    const funcAst = ast.output;
    const newAst = Object.assign({}, ast, {
      output: SqrlAst.registerCall(ast.output)
    });

    if (funcAst.type !== "call") {
      throw buildSqrlError(
        funcAst,
        "List comprehension statement must be a function"
      );
    }

    const statementFeature = functionRegistry.statementFeature(funcAst.func);
    parserState.addStatement(ast, statementFeature, newAst);
  } else if (ast.type === "when") {
    compileWhenBlock(parserState, ast);
  } else {
    sqrlInvariant(ast, false, `Unhandled ast type:: ${ast.type}`);
  }
}
