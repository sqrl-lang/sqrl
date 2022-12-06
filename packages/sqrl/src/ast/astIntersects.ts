/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlAst from "./SqrlAst";

import { foreachObject } from "../jslib/foreachObject";
import invariant from "../jslib/invariant";
import { sqrlInvariant } from "../api/parse";
import { buildSqrlError } from "../api/parse";
import { Ast } from "./Ast";

const booleanSet = new Set([false, true]);

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
    if (ast.left.type !== "feature") {
      throw new Error("Expected feature on left hand side");
    }
    if (ast.right.type !== "constant") {
      throw new Error("Expected constant on right hand side");
    }

    invariant(
      typeof values[ast.left.value] === "string",
      "Expected non-boolean value"
    );
    const value = values[ast.left.value] === ast.right.value;
    if (ast.operator === "=") {
      return value;
    } else if (ast.operator === "!=") {
      return !value;
    } else {
      throw new Error("Unknown binary_expr operator");
    }
  } else {
    throw new Error("Unexpected ast type during truth table calculate step");
  }
}

function extractFeatureValueSets(ast: Ast): {
  [feature: string]: Set<boolean | string>;
} {
  /***
   * Returns a map of /either/
   *   feature: true, [for boolean features]
   *   feature: Set(...values), [ for equalities ]
   */
  if (ast.type === "feature") {
    return {
      [ast.value]: booleanSet,
    };
  } else if (ast.type === "not") {
    return extractFeatureValueSets(ast.expr);
  } else if (ast.type === "boolean_expr") {
    sqrlInvariant(
      ast,
      ast.operator === "and" || ast.operator === "or",
      "Only and/or operators are allowed in where clause"
    );

    const results = {};
    for (const sub of [ast.left, ast.right]) {
      foreachObject(extractFeatureValueSets(sub), (values, feature) => {
        if (!results.hasOwnProperty(feature)) {
          results[feature] = values;
        } else if (values === booleanSet) {
          sqrlInvariant(
            ast,
            results[feature] === booleanSet,
            "Invalid where: feature must be defined as boolean or equality"
          );
        } else {
          sqrlInvariant(
            ast,
            results[feature] !== booleanSet,
            "Invalid where: feature must be defined as boolean or equality"
          );
          values.forEach((value) => results[feature].add(value));
        }
      });
    }
    return results;
  } else if (ast.type === "binary_expr") {
    sqrlInvariant(ast, ["=", "!="].indexOf(ast.operator) >= 0, ast.operator);

    if (ast.left.type !== "feature") {
      throw buildSqrlError(
        ast,
        "Counter where clause equality left-hand side must be a feature"
      );
    }

    if (ast.right.type !== "constant" || typeof ast.right.value !== "string") {
      throw buildSqrlError(
        ast,
        "Counter where clause equality right-hand side must be a constant string"
      );
    }

    return {
      [ast.left.value]: new Set([ast.right.value]),
    };
  } else {
    throw buildSqrlError(
      ast,
      "Only and/or/not and constant equality allowed in where clause"
    );
  }
}

function setCombinations(sets, callback) {
  const currentValues = {};

  const keys = Object.keys(sets);

  const calculateCombinations = (idx) => {
    if (idx === keys.length) {
      callback(currentValues);
    } else {
      for (const value of sets[keys[idx]]) {
        currentValues[keys[idx]] = value;
        calculateCombinations(idx + 1);
      }
    }
  };
  calculateCombinations(0);
}

function astIntersects(asts: Ast[]): boolean {
  if (asts.length <= 1) {
    return false;
  } else if (asts.some(SqrlAst.isConstantTrue)) {
    return true;
  }

  // Go through each ast and extract all the available features
  const valueSets = extractFeatureValueSets(SqrlAst.or(...asts));

  let intersected = false;
  setCombinations(valueSets, (values) => {
    intersected =
      intersected || asts.filter((ast) => calculate(ast, values)).length > 1;
  });
  return intersected;
}

export default astIntersects;
