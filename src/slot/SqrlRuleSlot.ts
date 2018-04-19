/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlSlot } from "./SqrlSlot";
import { Ast, RuleAst, SwitchAst, jsonAst } from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import invariant from "../jslib/invariant";
import { registerSlotClass, SerializedRuleSlot } from "./SerializedSlot";
import { SqrlDocDefinition, CostProps, SqrlFeatureDoc } from "../doc/SqrlDoc";
import { RuleSpec } from "../execute/LabelerSpec";
import { mapRegExpMatches } from "../jslib/mapRegExpMatches";
import { buildDocDefinition } from "./SqrlFeatureSlot";

export const REASON_FEATURE_REGEX = /\$\{([A-Za-z0-9_.]+)\}/g;

function getFeaturesFromReason(reason: string): string[] {
  return mapRegExpMatches(REASON_FEATURE_REGEX, reason, result => result[1]);
}

@registerSlotClass
export default class SqrlRuleSlot extends SqrlSlot {
  public ruleSpec: RuleSpec = null;

  private ast: Ast = null;
  private where: Ast = null;

  public definition: SqrlDocDefinition = null;

  constructor(name: string) {
    super(name);
  }
  deserializor(data: SerializedRuleSlot) {
    super.deserializor(data);
    this.ast = data.ast;
    this.where = data.where;
    this.definition = data.definition;
    this.ruleSpec = data.ruleSpec;
  }

  serialize(): SerializedRuleSlot {
    jsonAst(this.ast);
    jsonAst(this.where);
    return {
      ...(super.serialize() as SerializedRuleSlot),
      definition: this.definition,
      ast: this.ast,
      where: this.where,
      ruleSpec: this.ruleSpec
    };
  }

  finalizedAst() {
    invariant(
      this.where !== null && this.ast !== null,
      "SqrlSlot has not been set yet!"
    );
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
      this.ast === null,
      "Rule ast has already been set: %s",
      this.name
    );
    this.ast = ast;
    this.where = where;
  }

  buildDoc(costProps: CostProps): SqrlFeatureDoc {
    return { name: this.name, definitions: [this.definition], ...costProps };
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

  setRule(ast: RuleAst, globalWhere: Ast) {
    const exprAst = ast.where;

    invariant(
      ast.location,
      "Rule definitions must include location information"
    );

    const spec: RuleSpec = {
      name: ast.name,
      reason: ast.reason,
      features: getFeaturesFromReason(ast.reason)
    };

    this.ruleSpec = spec;
    this.definition = buildDocDefinition(ast, globalWhere);
    this.ast = { ...SqrlAst.bool(exprAst), location: ast.location };
    this.where = globalWhere;
  }
}
