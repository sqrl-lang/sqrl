/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlJs } from "../js/SqrlJs";
import { SqrlParseInfo, SqrlParserState, SlotFilter } from "./SqrlParserState";
import { processExprAst } from "../ast/AstExpr";
import { Expr, walkExpr, Slot } from "../expr/Expr";
import { Ast } from "../ast/Ast";
import { SqrlInputSlot } from "../slot/SqrlSlot";
import invariant from "../jslib/invariant";
import { isValidFeatureName } from "../feature/FeatureName";
import { compileParserStateAst } from "./SqrlCompile";
import { ExecutableSpec } from "../api/spec";
import { Context } from "../api/ctx";
import { buildSqrlError } from "../api/parse";

class ExprLoopError extends Error {
  constructor() {
    super("Encountered loop while generating expr output");
  }
}

export class SqrlCompiledOutput extends SqrlParseInfo {
  slotNames: string[];
  slotExprs: Expr[];
  slotCosts: number[];
  slotRecursiveCosts: number[];

  built: boolean = false;
  usedFiles: Set<string>;
  slotExprMap: { [slotName: string]: Expr } = {};

  private cost: { [name: string]: number } = {};
  private recursiveCost: { [name: string]: number } = {};
  private load: { [name: string]: Set<string> } = {};

  constructor(
    parserState: SqrlParserState,
    public slotFilter: SlotFilter | null = null
  ) {
    super(parserState.slots, parserState.options);
    this.usedFiles = parserState.usedFiles;
  }

  private ensureSlotCost(name: string) {
    // If we've got a cost make sure it's not `null` ("in calculation")
    if (this.cost.hasOwnProperty(name)) {
      invariant(this.cost[name] !== null, "Loop while calculating slotCost");
      return;
    } else {
      this.cost[name] = null;
    }

    const expr = this.exprForSlot(name);
    const load: Set<string> = new Set();
    let cost = 0;

    // Walk through the expr, keep track of everything we load and our own cost
    walkExpr(expr, node => {
      (node.load || []).forEach(slot => {
        if (load.has(slot.name)) {
          return;
        }

        this.getSlotCost(slot.name);

        // We need to load the given slot, and all it's children
        load.add(slot.name);
        this.load[slot.name].forEach(slotName => load.add(slotName));
      });

      if (node.type === "call") {
        cost += this.functionRegistry.getCost(node.func);
      }
    });

    let recursiveCost = cost;
    load.forEach(name => {
      recursiveCost += this.cost[name];
    });

    this.cost[name] = cost;
    this.recursiveCost[name] = recursiveCost;
    this.load[name] = load;
  }

  getSlotCost(name: string) {
    this.ensureSlotCost(name);
    return { cost: this.cost[name], recursiveCost: this.recursiveCost[name] };
  }

  exprForSlot(slotName: string): Expr {
    if (this.slotExprMap.hasOwnProperty(slotName)) {
      if (this.slotExprMap[slotName] === null) {
        throw new ExprLoopError();
      }
      return this.slotExprMap[slotName];
    }

    const slot = this.slots[slotName];
    if (slot instanceof SqrlInputSlot) {
      return {
        type: "input"
      };
    }

    // Mark it as null before processing so that we can throw if we find ourselves in a loop
    this.slotExprMap[slotName] = null;

    const ast: Ast = slot.finalizedAst();
    const expr = processExprAst(ast, this, this.functionRegistry);

    this.slotExprMap[slotName] = expr;

    return expr;
  }

  private fetchSlotNames(ctx: Context) {
    const used: Set<Slot> = new Set();
    const current: Set<Slot> = new Set();

    const throwLoopError = (slot: Slot, slotNames: string[]) => {
      // @TODO: This invariant protects us from allowing loops inside sqrl,
      // but it's implemented at too late a stage to provide nice error
      // messages. Ideally we'd have it higher up as well.

      slotNames = slotNames.filter(isValidFeatureName).sort();
      let errorMessage: string;
      if (isValidFeatureName(slot.name)) {
        errorMessage = `Feature '${slot.name}' depends on itself`;
        slotNames = slotNames.filter(name => name !== slot.name);
        if (slotNames.length) {
          errorMessage += ", see " + slotNames.join(", ");
        }
      } else {
        this.warn(
          {},
          "Feature loop detected on non-feature slot:: %s",
          slot.name
        );
        errorMessage =
          "Feature loop detected with features: " + slotNames.join(", ");
      }

      // @NOTE: You get much better error messages with this, but it's not user safe
      // const loops = this.printFeatureLoop(slot);
      // errorMessage += '\nDetected loops:\n  ' + loops.join('\n  ');
      throw buildSqrlError(slot.finalizedAst(), errorMessage);
    };

    const recurseUsedSlot = (slot: Slot) => {
      if (used.has(slot)) {
        return;
      } else {
        if (current.has(slot)) {
          throwLoopError(slot, Array.from(current).map(slot => slot.name));
        }
      }

      current.add(slot);

      let slotExpr: Expr;
      try {
        slotExpr = this.exprForSlot(slot.name);
      } catch (err) {
        if (err instanceof ExprLoopError) {
          const names = Object.keys(this.slotExprMap).filter(name => {
            return this.slotExprMap[name] === null;
          });
          throwLoopError(slot, names);
        } else {
          throw err;
        }
      }
      walkExpr(slotExpr, expr => {
        (expr.load || []).forEach(slot => {
          if (!used.has(slot)) {
            recurseUsedSlot(slot);
          }
        });
      });
      current.delete(slot);
      used.add(slot);
    };

    let slotNames: string[];
    if (this.slotFilter) {
      Object.entries(this.slots).forEach(([name, slot]) => {
        if (this.slotFilter(name)) {
          recurseUsedSlot(slot);
        }
      });

      slotNames = Object.keys(this.slots).filter(name => {
        return used.has(this.slots[name]);
      });
    } else {
      slotNames = Object.keys(this.slots);
      // This recurse is required for picking up cycles, might be able to remove one day
      Object.values(this.slots).forEach(slot => recurseUsedSlot(slot));
    }

    const usedSlotNames: (string | null)[] = slotNames.map(name =>
      this.slots.hasOwnProperty(name) ? name : null
    );

    return { slotNames, usedSlotNames };
  }

  private performBuild(ctx: Context) {
    const { slotNames, usedSlotNames } = this.fetchSlotNames(ctx);

    const slotExprs = usedSlotNames.map((name, idx) => {
      if (!name) {
        return null;
      }
      this.slots[name].setIndex(idx);
      return this.exprForSlot(name);
    });

    this.built = true;
    this.slotNames = slotNames;
    this.slotExprs = slotExprs;

    this.calculateCostData(ctx, usedSlotNames);
  }

  private calculateCostData(ctx: Context, usedSlotNames: string[]) {
    usedSlotNames.forEach(name => {
      if (name) {
        this.ensureSlotCost(name);
      }
    });
    this.slotCosts = usedSlotNames.map(name => name && this.cost[name]);
    this.slotRecursiveCosts = usedSlotNames.map(
      name => name && this.recursiveCost[name]
    );
  }

  fetchBuildOutput(ctx: Context) {
    if (!this.built) {
      this.performBuild(ctx);
    }

    return {
      slotNames: this.slotNames,
      slotExprs: this.slotExprs,
      slotCosts: this.slotCosts,
      slotRecursiveCosts: this.slotRecursiveCosts
    };
  }

  private buildSlotJs(slotNames: string[], slotExprs: Expr[]) {
    return slotExprs.map((fetchExpr, idx) => {
      invariant(
        fetchExpr,
        "Expected source for null fetchExpr:: %s",
        slotNames[idx]
      );

      if (fetchExpr.type === "input") {
        return null;
      }

      return SqrlJs.generateExpr(this.functionRegistry, fetchExpr);
    });
  }

  async buildLabelerSpec(
    ctx: Context,
    options: {} = {}
  ): Promise<ExecutableSpec> {
    const {
      slotNames,
      slotExprs,
      slotCosts,
      slotRecursiveCosts
    } = this.fetchBuildOutput(ctx);

    const usedFiles = Array.from(this.usedFiles);
    const ruleSpec = this.getRuleSpecs();
    const slotJs = this.buildSlotJs(slotNames, slotExprs);

    return {
      slotNames,
      slotCosts,
      slotRecursiveCosts,
      ruleSpec,
      usedFiles,
      slotJs
    };
  }

  static async build(
    ctx: Context,
    parserState: SqrlParserState,
    options: {
      buildFeatures?: string[];
      skipCostCalculations?: boolean;
    } = {}
  ): Promise<SqrlCompiledOutput> {
    compileParserStateAst(parserState);

    const ruleNames = [];

    let featureSet = null;
    if (options.buildFeatures) {
      // Make sure to include ruleNames as well to reduce confusion
      featureSet = new Set([...options.buildFeatures, ...ruleNames]);
    }

    let slotFilter: SlotFilter = null;
    if (featureSet) {
      slotFilter = name => featureSet.has(name);
    }

    return new SqrlCompiledOutput(parserState, slotFilter);
  }
}
