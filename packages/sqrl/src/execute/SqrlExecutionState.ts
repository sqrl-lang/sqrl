/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Manipulator } from "../platform/Manipulator";
import SqrlObject from "../object/SqrlObject";

import bluebird = require("bluebird");
import { foreachObject } from "../jslib/foreachObject";
import invariant from "../jslib/invariant";
import isPromise from "../jslib/isPromise";
import util = require("util");
import { niceForEach } from "node-nice";
import SqrlSourcePrinter from "../compile/SqrlSourcePrinter";
import { RuleSpecMap } from "./LabelerSpec";
import * as moment from "moment";
import { isValidFeatureName } from "../feature/FeatureName";
import { DatabaseSet, Context } from "../api/ctx";
import { FeatureMap } from "../api/execute";

export interface SqrlExecutionErrorProps {
  functionName?: string;
  vitalError?: boolean;
  [key: string]: any;
}
export interface SqrlExecutionOptions {
  featureTimeout: number;
  ruleSpecs: RuleSpecMap;

  requiredSlots?: number[];
  sourcePrinter?: SqrlSourcePrinter;
  slotCost?: number[];
}

export class SlotMissingCallbackError extends Error {
  constructor(public slotName: string) {
    super(`Could not find function to generate slot value:: ${slotName}`);
  }
}

export class SqrlExecutionState {
  slots: bluebird<any>[];
  names: string[];
  functionCache;
  counterBumps;
  loggedCodedErrors: Set<string>;
  sourcePrinter: SqrlSourcePrinter;
  featureTimeout: number;
  currentCost: number = 0;
  public traceFunctions: boolean;
  public databaseSet: DatabaseSet | null;
  private clockMs: number = null;
  public ruleSpecs: RuleSpecMap;

  /** @hidden */
  public ctx: Context;

  _fetch: (slot: number) => bluebird<any>;

  constructor(
    ctx: Context,
    slotCallbacks,
    names = [],
    public manipulator: Manipulator = null,
    props: SqrlExecutionOptions,
    features: FeatureMap
  ) {
    this.ctx = ctx;
    this.featureTimeout = props.featureTimeout;
    this.slots = Array(slotCallbacks.length);
    this.counterBumps = [];
    this.names = names;
    this.functionCache = {};
    this.loggedCodedErrors = new Set();
    this.databaseSet = ctx.requireDatabaseSet();
    this.ruleSpecs = props.ruleSpecs;

    // Depending on the type of execution these may be null
    this.sourcePrinter = props.sourcePrinter || null;

    const slotCost: number[] = props.slotCost;
    this._fetch = (slotIdx: number) => {
      const slotCalc = slotCallbacks[slotIdx];

      if (!slotCalc) {
        throw new SlotMissingCallbackError(this.names[slotIdx]);
      }

      this.currentCost += slotCost ? slotCost[slotIdx] : 0;
      return slotCalc.call(this);
    };

    this.setFeatures(features);
    (props.requiredSlots || []).forEach(index => {
      invariant(
        this.slots[index],
        "Slot %s required for execution",
        this.names[index]
      );
    });
  }

  async fetchClock() {
    const clockValue = await this.fetchBasicByName("SqrlClock");
    invariant(
      clockValue !== null,
      "fetchClock() could not fetch the SqrlClock feature"
    );
    const clockMoment = moment(clockValue, moment.ISO_8601);
    invariant(
      clockMoment.isValid(),
      "Invalid ISO 8601 string provided as SqrlClock"
    );
    this.clockMs = clockMoment.valueOf();
  }
  getClock() {
    invariant(this.clockMs !== null, "Clock not fetched or unavailable");
    return this.clockMs;
  }

  // @TODO: Deprecate in place of cacheAccessor
  functionCacheAccessor<T>(key: string, callback: () => T): T {
    if (!this.functionCache.hasOwnProperty(key)) {
      this.functionCache[key] = callback();
    }
    return this.functionCache[key];
  }

  cacheAccessor<T>(symbol: symbol, key: string, callback: () => T): T {
    this.functionCache[symbol] = this.functionCache[symbol] || {};
    if (!this.functionCache[symbol].hasOwnProperty(key)) {
      this.functionCache[symbol][key] = callback();
    }
    return this.functionCache[symbol][key];
  }

  trace(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.trace(props, format, ...args);
  }
  debug(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.debug(props, format, ...args);
  }
  info(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.info(props, format, ...args);
  }
  warn(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.warn(props, format, ...args);
  }
  error(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.error(props, format, ...args);
  }
  fatal(props: { [key: string]: any }, format: string, ...args: Array<any>) {
    return this.ctx.fatal(props, format, ...args);
  }

  codedWarning(format: string, ...args: Array<any>) {
    const message = util.format(format, ...args);
    if (this.manipulator) {
      this.manipulator.codedWarnings.push(message);
    }
    this.warn({}, message);
  }

  setFeatures(featureMap: FeatureMap) {
    foreachObject(featureMap, (value, featureName) => {
      const index = this.getSlot(featureName);
      invariant(!isPromise(value), "setFeatures() does not work with promises");
      invariant(
        !this.slots[index],
        "setFeatures() cannot overwrite loaded slots"
      );
      this.slots[index] = bluebird.resolve(value);
    });
  }

  setFutureFeatures(featureMap) {
    foreachObject(featureMap, (promise: bluebird<any>, featureName) => {
      const index = this.getSlot(featureName);
      invariant(
        promise instanceof bluebird,
        "setFutureFeatures() requires bluebird promises"
      );
      invariant(
        !this.slots[index],
        "setFutureFeatures() cannot overwrite loaded slots"
      );
      this.slots[index] = promise;
    });
  }

  fetch(slot) {
    let value = this.slots[slot];
    if (!value) {
      value = this._fetch(slot);
      this.slots[slot] = value;
    }
    return value;
  }

  getFeatureNames() {
    return this.names.filter(isValidFeatureName);
  }

  getSlot(name: string): number {
    invariant(typeof name === "string", "Expected string name for getSlot()");
    const index = this.names.indexOf(name);
    invariant(index >= 0, "Could not find the requested name:: %s", name);
    return index;
  }

  async tryWait(name: string): Promise<void> {
    const index = this.names.indexOf(name);
    if (index > 0) {
      await this.build([index]);
    }
  }

  fetchByName(name) {
    return bluebird.resolve(this.fetchByName_(name));
  }
  async fetchByName_(name): Promise<any> {
    return this.fetch(this.getSlot(name));
  }

  fetchBasicByName(name) {
    return this.fetchByName(name).then(result =>
      SqrlObject.ensureBasic(result)
    );
  }

  prepare(slotIndexes: number[]): bluebird<void> {
    return bluebird.resolve(this.prepare_(slotIndexes));
  }
  prepare_(slotIndexes: number[]): Promise<void> {
    return niceForEach(slotIndexes, idx => {
      if (!this.slots[idx]) {
        this.slots[idx] = this._fetch(idx);
      }
    });
  }

  wait(slotIndexes: number[]): bluebird<void> {
    // Wait for a given list of slot indexes to be ready. They *must* have
    // already  been prepared before calling wait.
    let currentSlotIndex = 0;
    const wait = () => {
      while (currentSlotIndex < slotIndexes.length) {
        const slot = this.slots[slotIndexes[currentSlotIndex++]];
        if (!slot.isResolved()) {
          return slot.then(wait);
        }
      }
    };
    return wait() || bluebird.resolve();
  }

  build(slotIndexes: number[]): bluebird<void> {
    // This ensures all the given slot indexes have been fetched
    return this.prepare(slotIndexes).then(() => this.wait(slotIndexes));
  }

  load(slotIndexes) {
    // Fetch all the given slots and return an array containing the values
    return this.prepare(slotIndexes).then(() => {
      return bluebird.all(slotIndexes.map(idx => this.slots[idx]));
    });
  }

  loadByNames(featureNames) {
    return this.load(featureNames.map(name => this.getSlot(name)));
  }

  logCodedErrorMessage(format: string, ...args: Array<any>) {
    const msg = util.format(format, ...args);
    if (this.loggedCodedErrors.has(msg)) {
      return;
    }

    this.loggedCodedErrors.add(msg);
    this.ctx.warn({}, `CodedError during sqrl execution:: ${msg}`);
  }

  logError(err: Error, props: SqrlExecutionErrorProps = {}): void {
    const errorType = (err as any).code || err.name || "other";

    if (this.manipulator) {
      this.manipulator.logError({
        functionName: props.functionName || null,
        errorType,
        timestamp: Date.now()
      });
    }

    let msg: string;
    if (props.functionName) {
      msg = `Error in sqrl function ${props.functionName}: ${err.toString()}`;
    } else {
      msg = `Error in sqrl execution: ${err.toString()}`;
    }

    const errorProps = Object.assign(
      {
        err,
        errorType
      },
      props
    );
    if (props.vitalError) {
      this.fatal(errorProps, "Vital error " + msg);
    } else {
      this.error(errorProps, msg);
    }
  }

  getNamedGlobals() {
    const sortedNames = Array.from(this.names).sort();
    return sortedNames.filter(name => !name.startsWith("ast:"));
  }
}
