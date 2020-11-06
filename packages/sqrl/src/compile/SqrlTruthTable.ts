/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "../jslib/invariant";
import { Ast, BinaryExprAst, FeatureAst, NotAst } from "../ast/Ast";
import { sqrlInvariant, buildSqrlError } from "../api/parse";

export interface ValidBinaryExprAst extends BinaryExprAst {
  type: "binary_expr";
  left: FeatureAst;
  right: FeatureAst;
}
export interface ValidBooleanExprAst extends BinaryExprAst {
  type: "boolean_expr";
  left: ValidAst;
  right: ValidAst;
}
export interface ValidNotAst extends NotAst {
  expr: ValidAst;
}
export type ValidAst =
  | FeatureAst
  | ValidBinaryExprAst
  | ValidBooleanExprAst
  | ValidNotAst;

function ensureValidAst(ast: Ast): ast is ValidAst {
  if (ast.type === "binary_expr") {
    sqrlInvariant(
      ast,
      ["=", "!="].includes(ast.operator),
      "Binary operator %s not valid in counter where clause",
      ast.operator
    );
    sqrlInvariant(
      ast,
      ast.left.type === "feature",
      "Counter where clause equality left-hand side must be a feature"
    );
    sqrlInvariant(
      ast,
      ast.right.type === "constant" && typeof ast.right.value === "string",
      "Counter where clause equality right-hand side must be a constant string"
    );
    return true;
  } else if (ast.type === "boolean_expr") {
    sqrlInvariant(
      ast,
      ["and", "or"].includes(ast.operator),
      "Only and/or/not operators are valid in a where clause"
    );
    return ensureValidAst(ast.left) && ensureValidAst(ast.right);
  } else if (ast.type === "not") {
    return ensureValidAst(ast.expr);
  } else if (ast.type === "feature") {
    return true;
  } else {
    throw buildSqrlError(
      ast,
      "Only and/or/not and constant equality allowed in where clause"
    );
  }
}

function binaryFeatureName(ast: ValidBinaryExprAst) {
  ensureValidAst(ast);
  return ast.left.value + "=" + JSON.stringify(ast.right.value);
}

function calculate(ast: Ast, values) {
  if (ast.type === "feature") {
    invariant(
      typeof values[ast.value] === "boolean",
      "Expected feature to be set"
    );
    return values[ast.value];
  } else if (ast.type === "not") {
    return !calculate(ast.expr, values);
  } else if (ast.type === "boolean_expr") {
    if (ast.operator === "and") {
      return calculate(ast.left, values) && calculate(ast.right, values);
    } else if (ast.operator === "or") {
      return calculate(ast.left, values) || calculate(ast.right, values);
    } else {
      throw new Error("Unknown ast operator during calculate step");
    }
  } else if (ast.type === "binary_expr") {
    const name = binaryFeatureName(ast as ValidBinaryExprAst);
    invariant(typeof values[name] === "boolean", "Expected value to be set");
    if (ast.operator === "=") {
      return values[name];
    } else if (ast.operator === "!=") {
      return !values[name];
    } else {
      throw new Error("Unknown binary_expr operator");
    }
  } else {
    throw new Error("Unexpected ast type during truth table calculate step");
  }
}

function extractFeatures(ast: ValidAst): Set<string> {
  if (ast.type === "feature") {
    return new Set([ast.value]);
  } else if (ast.type === "not") {
    return extractFeatures(ast.expr);
  } else if (ast.type === "boolean_expr") {
    sqrlInvariant(
      ast,
      ast.operator === "and" || ast.operator === "or",
      "Only and/or operators are allowed in where clause"
    );
    const features = extractFeatures(ast.left);
    extractFeatures(ast.right).forEach((feature?) => features.add(feature));
    return features;
  } else if (ast.type === "binary_expr") {
    return new Set([binaryFeatureName(ast)]);
  } else {
    throw buildSqrlError(
      ast,
      "Only and/or/not and constant equality allowed in where clause"
    );
  }
}

function featureCombinations(features, callback) {
  // Create initial truth table value map all of false
  const values = {};

  const calculateCombinations = (featureIndex) => {
    if (featureIndex === features.length) {
      callback(values);
    } else {
      // First calculate with feature=false
      values[features[featureIndex]] = false;
      calculateCombinations(featureIndex + 1);
      // Then calculate with feature=true
      values[features[featureIndex]] = true;
      calculateCombinations(featureIndex + 1);
    }
  };
  calculateCombinations(0);
}

function buildTruthTable(ast, features) {
  // Generate the truth table as a binary string
  let truthTable = "";
  featureCombinations(features, (values?) => {
    truthTable += calculate(ast, values) ? "1" : "0";
  });
  return truthTable;
}

export function reduceTruthTable(
  ast: Ast
): {
  features: string[];
  truthTable: string;
} {
  // Single true value is just an empty string, don't allow any other constants
  if (ast.type === "constant") {
    sqrlInvariant(
      ast,
      ast.value === true,
      "Counter where clauses should not be constant"
    );
    return {
      features: [],
      truthTable: "",
    };
  }

  if (!ensureValidAst(ast)) {
    // For typescript!
    throw new Error("ensureValidAst() should not return false");
  }

  // Fetch a sorted list of features
  const features: string[] = Array.from(extractFeatures(ast)).sort();
  const truthTable: string = buildTruthTable(ast, features);

  if (truthTable === "") {
    throw new Error("Did not expect empty truth table");
  }

  return {
    features,
    truthTable,
  };
}

export function stringifyValidAst(ast: ValidAst): string {
  if (ast.type === "binary_expr") {
    return binaryFeatureName(ast);
  } else if (ast.type === "boolean_expr") {
    return `(${stringifyValidAst(ast.left)} ${ast.operator} ${stringifyValidAst(
      ast.right
    )})`;
  } else if (ast.type === "not") {
    return `NOT ${stringifyValidAst(ast.expr)}`;
  } else if (ast.type === "feature") {
    return ast.value;
  }
  throw new Error("Unknown ast type for stringify");
}
export function stringifyWhereAst(ast: Ast) {
  // Single true value is just an empty string, don't allow any other constants
  if (ast.type === "constant") {
    sqrlInvariant(
      ast,
      ast.value === true,
      "Counter where clauses should not be constant"
    );
    return "true";
  }

  if (!ensureValidAst(ast)) {
    // For typescript!
    throw new Error("ensureValidAst() should not return false");
  }
  return stringifyValidAst(ast);
}
