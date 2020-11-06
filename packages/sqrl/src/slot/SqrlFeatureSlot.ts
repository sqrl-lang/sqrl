/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlSlot } from "./SqrlSlot";
import {
  Ast,
  LetAst,
  SwitchCaseAst,
  RuleAst,
  extractAstFeatures,
  SwitchAst,
  jsonAst,
} from "../ast/Ast";
import astIntersects from "../ast/astIntersects";
import SqrlAst from "../ast/SqrlAst";
import { buildSqrlError, sqrlInvariant } from "../api/parse";
import { stringifyWhereAst } from "../compile/SqrlTruthTable";
import invariant from "../jslib/invariant";
import { SerializedFeatureSlot, registerSlotClass } from "./SerializedSlot";
import { FeatureDoc, FeatureDefinition } from "../api/spec";

export interface CostProps {
  cost: number;
  recursiveCost: number;
}

export function buildDocDefinition(
  ast: RuleAst | LetAst,
  globalWhere: Ast
): FeatureDefinition {
  const features = extractAstFeatures(SqrlAst.list(ast, globalWhere));
  const { location } = ast;
  return {
    filename: location.filename,
    start: location.start,
    end: location.end,
    description: ast.description,
    source: location.source.slice(location.start.offset, location.end.offset),
    includedWhere: definitionIncludedWhere(globalWhere),
    features,
  };
}

function definitionIncludedWhere(where: Ast): string | null {
  return SqrlAst.isConstantTrue(where) ? null : stringifyWhereAst(where);
}

@registerSlotClass
export default class SqrlFeatureSlot extends SqrlSlot {
  private ast: Ast = null;
  private where: Ast = null;

  public definitions: FeatureDefinition[] = [];

  private finalized = false;
  private final = false;
  private replaceable = true;

  /* Mark whether or not the default case of this feature is replaceable.
   *
   * common.sqrl - LET A := 5;
   *
   * custom.sqrl - LET A := 6 WHERE B;  [defaultCase=5, defaultCaseReplaceable=true]
   *             - LET A := 7 DEFAULT;  [defaultCase=7, defaultCaseReplaceable=false]
   */
  private defaultCaseReplaceable = false;

  constructor(name: string) {
    super(name);
  }
  deserializor(data: SerializedFeatureSlot) {
    super.deserializor(data);
    this.final = data.final;
    this.replaceable = true;
    this.ast = data.ast;
    this.where = data.where;

    // Ensure we keep a copy of the definitions list since we may add to it
    this.definitions = [...data.definitions];
  }

  serialize(): SerializedFeatureSlot {
    jsonAst(this.ast);
    jsonAst(this.where);
    return {
      ...(super.serialize() as SerializedFeatureSlot),
      definitions: this.definitions,
      final: this.final,
      ast: this.ast,
      where: this.where,
    };
  }

  finalizedAst() {
    invariant(
      this.where !== null && this.ast !== null,
      "SqrlSlot has not been set yet!"
    );
    this.finalized = true;
    return SqrlAst.branch(this.where, this.ast, SqrlAst.constant(null));
  }

  setAst(ast: Ast, where: Ast): void {
    invariant(
      typeof ast === "object" && typeof where === "object",
      `setAst requires objects, got %s %s`,
      typeof ast,
      typeof where
    );

    invariant(
      !this.finalized,
      "Slot cannot be set after it is read: %s",
      this.name
    );
    this.ast = ast;
    this.where = where;
  }

  getFirstLocation(): FeatureDefinition {
    return this.definitions[0];
  }
  buildDoc(costProps: CostProps): FeatureDoc {
    return { name: this.name, definitions: this.definitions, ...costProps };
  }

  throwMultipleDefinitionsError(ast: Ast, previousDefinitions: Ast[]): never {
    let msg = `Multiple definitions of ${this.name}`;

    const otherLocations = previousDefinitions
      .map((ast) => ast.location)
      .filter(Boolean);
    if (otherLocations.length) {
      msg += "\n" + SqrlAst.srcLines(otherLocations);
    }

    throw buildSqrlError(ast, msg);
  }

  addDefinition(ast: RuleAst | LetAst, globalWhere: Ast) {
    this.definitions.push(buildDocDefinition(ast, globalWhere));
  }

  getFeatureAst(): SwitchAst | null {
    if (this.ast === null) {
      return null;
    }
    if (this.ast.type !== "switch") {
      throw new Error("Expected SqrlFeatureSlot to be a switch ast");
    }
    return this.ast;
  }

  allowReplace() {
    this.replaceable = true;
  }

  mergeGlobal(
    ast: LetAst,
    globalWhere: Ast,
    combineWheres: (
      whereAst: Ast,
      globalWhere: Ast
    ) => {
      combinedAst: Ast;
      whereAst: Ast;
      whereFeatures: string[];
      whereTruth: string;
    }
  ) {
    const { expr, isDefaultCase, where } = ast;

    sqrlInvariant(
      ast,
      !this.final,
      "Feature has been marked as final and cannot be overwritten: %s",
      this.name
    );

    let cases: SwitchCaseAst[] = [];
    let defaultCase: Ast = null;

    const switchAst = this.getFeatureAst();

    if (this.replaceable) {
      this.replaceable = false;
      this.defaultCaseReplaceable = true;
      defaultCase = switchAst;
    } else if (switchAst) {
      cases = Array.from(switchAst.cases);
      defaultCase = switchAst.defaultCase;
    }

    let thisCase: Ast = null;

    if (isDefaultCase) {
      sqrlInvariant(
        ast,
        SqrlAst.isConstantTrue(globalWhere),
        "LET statement with DEFAULT is not valid in file included with WHERE"
      );
      sqrlInvariant(
        ast,
        this.defaultCaseReplaceable,
        "Feature already has a default case set: %s",
        this.name
      );
      defaultCase = expr;
      thisCase = expr;
    } else {
      const { combinedAst, whereAst } = combineWheres(where, globalWhere);

      thisCase = {
        type: "switchCase",
        ast,
        expr,
        truthTableWhere: combinedAst,
        where: whereAst,
      };

      cases.push(thisCase);

      // make sure we don't add conflicting where clauses
      const hasIntersection = astIntersects(
        cases.map((c) => c.truthTableWhere)
      );
      if (hasIntersection) {
        this.throwMultipleDefinitionsError(
          ast,
          cases.slice(0, -1).map((c) => c.ast)
        );
      }

      // If this case is always true, remove any other cases
      if (SqrlAst.isConstantTrue(thisCase.where)) {
        cases = [thisCase];
        defaultCase = null;
      }
    }

    this.setAst({ type: "switch", cases, defaultCase }, SqrlAst.constant(true));
    this.addDefinition(ast, globalWhere);
    this.final = this.final || ast.final;
  }
}
