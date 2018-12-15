/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlExecutionState } from "./SqrlExecutionState";

import { Manipulator } from "../api/Manipulator";
import SqrlSourcePrinter from "../compile/SqrlSourcePrinter";
import { ExecutableSpec, RuleSpecMap } from "../api/ExecutableSpec";
import { JsExecutionContext } from "./JsExecutionContext";
import { Context } from "../api/ctx";
import { FeatureMap } from "../api/execute";

const DEFAULT_FEATURE_TIMEOUT_MS = 1000;
function zipToObjects(keys: string[], objects: any) {
  const objectNames = Object.keys(objects);
  const rv = {};

  keys.forEach((key, idx) => {
    rv[key] = {};
    objectNames.forEach(obj => {
      rv[key][obj] = objects[obj][idx];
    });
  });
  return rv;
}

export class SqrlExecutable {
  version: string;
  parentVersion: string;
  slotCount: number;
  parent: SqrlExecutable;
  sourcePrinter: SqrlSourcePrinter;

  slotNames: string[];
  slotJs: string[];
  slotCallback: (() => Promise<any>)[];
  slotCosts: number[];
  slotRecursiveCosts: number[];

  ruleSpecs: RuleSpecMap;

  // Array of slots required in order to run the labeler
  requiredSlots: number[];

  constructor(executionContext: JsExecutionContext, props: ExecutableSpec) {
    const { slotNames, slotJs } = props;

    this.ruleSpecs = props.ruleSpec;
    this.slotNames = slotNames;
    this.slotCount = slotJs.length;
    this.slotCosts = props.slotCosts;
    this.slotRecursiveCosts = props.slotRecursiveCosts;
    this.slotJs = slotJs;

    this.requiredSlots = [];
    this.slotCallback = slotJs.map((js, index) => {
      if (js === null) {
        this.requiredSlots.push(index);
        return null;
      }
      return executionContext.compileSlotJs(js);
    });

    this.sourcePrinter = new SqrlSourcePrinter({
      slotNames,
      slotJs
    });
  }

  async startExecution(
    ctx: Context,
    options: {
      manipulator?: Manipulator;
      inputs?: FeatureMap;
      featureTimeoutMs?: number;
    } = {}
  ): Promise<SqrlExecutionState> {
    const manipulator = options.manipulator || null;

    const state = new SqrlExecutionState(
      ctx,
      this.slotCallback,
      this.slotNames,
      manipulator,
      {
        featureTimeout: options.featureTimeoutMs || DEFAULT_FEATURE_TIMEOUT_MS,
        sourcePrinter: this.sourcePrinter,
        slotCost: this.slotCosts,
        requiredSlots: this.requiredSlots,
        ruleSpecs: this.ruleSpecs
      },
      options.inputs || {}
    );
    await state.fetchClock();
    return state;
  }

  dumpSlotInformation(): {
    [slotName: string]: { cost: number; recursiveCost: number };
  } {
    return zipToObjects(this.slotNames, {
      cost: this.slotCosts,
      recursiveCost: this.slotRecursiveCosts
    });
  }

  getNames() {
    return this.slotNames;
  }
}

export default SqrlExecutable;
