/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  Ast,
  SlotAst,
  jsonAst,
  CallAst,
  ListAst,
  walkAst,
  astSlotNames,
  RuleAst,
  StatementAst
} from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import SqrlAstTransformer from "../ast/SqrlAstTransformer";
import {
  SqrlSlot,
  SqrlConstantSlot,
  SqrlStatementSlot,
  SqrlFixedSlot,
  SqrlIteratorSlot,
  SqrlEmptySlot,
  SqrlInputSlot
} from "../slot/SqrlSlot";
import { SqrlFunctionRegistry } from "../function/FunctionRegistry";
import invariant from "../jslib/invariant";
import mapObject from "../jslib/mapObject";
import { SerializedSlot, deserializeSlot } from "../slot/SerializedSlot";
import { isValidFeatureName } from "../feature/FeatureName";
import SqrlImporter from "./SqrlImporter";
import SqrlFeatureSlot from "../slot/SqrlFeatureSlot";
import { reduceTruthTable } from "./SqrlTruthTable";
import { murmurhashJsonHexSync } from "../jslib/murmurhashJson";
import { NodeId } from "../platform/NodeId";
import { LABELER_FEATURE_FUNCTION } from "../function/StdlibFunctions";
import { Filesystem, EmptyFilesystem } from "../api/filesystem";
import SqrlRuleSlot from "../slot/SqrlRuleSlot";
import { RuleSpec } from "../api/ExecutableSpec";
import { AbstractLogger } from "../util/Logger";
import { LogProperties, getGlobalLogger } from "../api/log";
import { buildSqrlError } from "./buildSqrlError";
import { sqrlInvariant } from "../api/parse";
import { FeatureMap } from "../api/execute";

export interface SqrlParserSourceOptions {
  statements: StatementAst[];
  source: string;
  filesystem: Filesystem;
}
export interface SqrlParserOptions {
  statements: StatementAst[];
  filesystem?: Filesystem;
  functionRegistry: SqrlFunctionRegistry;
  allowAssertions?: boolean;
  allowPrivate?: boolean;
  baseLibrary?: string;
  source?: string;
  mainFile?: string;
  setInputs?: FeatureMap;
  allowReplaceInput?: boolean;
}

export interface SqrlSerialized {
  slots: {
    [name: string]: SerializedSlot;
  };
}

export type SlotFilter = (slotName: string) => boolean;

function labelOperationWaitNames(props?: {
  operation: string;
  label: string;
  feature: string;
}) {
  const { operation, label, feature } = props;
  return [`wait-label:op=${operation}:label=${label}:feature=${feature}`];
}

export abstract class SqrlParseInfo extends AbstractLogger {
  baseLibrary: string;
  allowAssertions: boolean;
  allowPrivate: boolean;
  functionRegistry: SqrlFunctionRegistry;
  importer: SqrlImporter;
  filesystem: Filesystem;
  remainingInputs: FeatureMap;
  allowReplaceInput: boolean;
  statements: StatementAst[];

  constructor(
    public slots: { [name: string]: SqrlSlot },
    public options: SqrlParserOptions
  ) {
    super();
    this.statements = options.statements;
    this.allowAssertions = options.allowAssertions || false;
    this.allowPrivate = options.allowPrivate || false;
    this.baseLibrary = options.baseLibrary || "common.sqrl";
    this.functionRegistry = options.functionRegistry;
    this.allowReplaceInput = options.allowReplaceInput || false;
    this.filesystem = options.filesystem || new EmptyFilesystem();
    this.importer = new SqrlImporter(this.filesystem);
    this.remainingInputs = Object.assign({}, options.setInputs || {});
  }

  log(level: string, props: LogProperties, format: string, ...params: any[]) {
    getGlobalLogger().log(level, props, format, params);
  }

  mapToSlots(names: string[]): SqrlSlot[] {
    return names.map(name => {
      invariant(
        this.slots.hasOwnProperty(name),
        "Could not find slot:: " + name
      );
      return this.slots[name];
    });
  }

  // These two could be generalised with some typescript magic
  foreachRuleSlot(callback: (slot: SqrlRuleSlot) => void) {
    Object.values(this.slots).forEach(slot => {
      if (slot instanceof SqrlRuleSlot) {
        callback(slot);
      }
    });
  }
  foreachFeatureSlot(callback: (slot: SqrlFeatureSlot) => void) {
    Object.values(this.slots).forEach(slot => {
      if (slot instanceof SqrlFeatureSlot) {
        callback(slot);
      }
    });
  }

  resetReplaceableFeatures() {
    this.foreachFeatureSlot(slot => slot.allowReplace());
  }

  getRuleSlots() {
    const rv: { [name: string]: SqrlRuleSlot } = {};
    this.foreachRuleSlot(slot => {
      rv[slot.name] = slot;
    });
    return rv;
  }

  getFeatureSlotNames() {
    return Object.keys(this.slots).filter(isValidFeatureName);
  }

  getRuleSpecs() {
    return mapObject(this.getRuleSlots(), value => {
      return value.ruleSpec;
    });
  }

  getRuleSpec(sourceAst: Ast, ruleName: string): RuleSpec {
    const slot = this.slots[ruleName];
    if (slot instanceof SqrlRuleSlot) {
      return slot.ruleSpec;
    } else {
      throw buildSqrlError(sourceAst, `Unknown rule: ${ruleName}`);
    }
  }
}

export class SqrlParserState extends SqrlParseInfo {
  _astTransformer: SqrlAstTransformer | null;
  _pushStatement: (ast: Ast) => void = null;
  globalWhere: Ast = SqrlAst.constant(true);
  currentIterator: string | null = null;

  functionRegistry: SqrlFunctionRegistry;
  usedFiles: Set<string> = new Set();

  constructor(options: SqrlParserOptions, serialized: SqrlSerialized = null) {
    super(
      serialized
        ? mapObject(serialized.slots, data => deserializeSlot(data))
        : {},
      options
    );

    this.functionRegistry = this.functionRegistry;

    this.setDefaultValue("SqrlMutate", SqrlAst.constant(true));
    this.setDefaultValue("SqrlIsClassify", SqrlAst.constant(true));
    this.setDefaultValue("SqrlClock", SqrlAst.call("now", []));

    const executionComplete = this.ensureStatementFeature(
      null,
      "SqrlExecutionComplete"
    );
    [...this.functionRegistry.statementFeatures].forEach(name => {
      this.ensureStatementFeature(null, name);
      if (name !== "SqrlAssertionStatements") {
        // Assertion statements often depend on execution
        executionComplete.addWait(name);
      }
    });
  }

  ensureIterator(ast: Ast, name: string) {
    // Maybe one day we won't have to give unique names to iterators, but for
    // now they can be referenced as features so there's no safe way of doing
    // it.
    if (this.slots.hasOwnProperty(name)) {
      sqrlInvariant(
        ast,
        this.slots[name] instanceof SqrlIteratorSlot,
        "Iterators cannot have the same name as a feature or rule"
      );
    } else {
      this.slots[name] = new SqrlIteratorSlot(name);
    }
  }

  setDefaultValue(name: string, valueAst: Ast) {
    invariant(this.slotIsEmpty(name), "Slot was already defined: %s", name);
    this.slots[name] = new SqrlFixedSlot(name, valueAst, true);
  }

  pushStatement(ast: Ast) {
    invariant(
      this._pushStatement !== null,
      "ParserState push statement not set"
    );
    if (ast.type === "let") {
      if (
        ast.expr.type === "call" &&
        ast.expr.func === LABELER_FEATURE_FUNCTION
      ) {
        if (!this.slotIsEmpty(ast.feature)) {
          throw buildSqrlError(ast, "Multiple definitions of feature");
        }

        if (this.remainingInputs.hasOwnProperty(ast.feature)) {
          this.slots[ast.feature] = new SqrlConstantSlot(
            ast.feature,
            this.remainingInputs[ast.feature]
          );
          delete this.remainingInputs[ast.feature];
        } else {
          this.slots[ast.feature] = new SqrlInputSlot(ast.feature);
        }
        return;
      }
    } else if (
      ast.type === "call" &&
      ast.func === "_resetReplaceableFeatures"
    ) {
      sqrlInvariant(
        ast,
        ast.args.length === 0,
        "Expected no arguments to _resetReplaceableFeatures"
      );
      this.resetReplaceableFeatures();
      return;
    }

    ast = this.transform(ast);
    if (ast.type === "let") {
      const oldSlot = this.slots[ast.feature];
      if (
        this.slotIsEmpty(ast.feature) ||
        (oldSlot instanceof SqrlInputSlot && this.allowReplaceInput) ||
        (oldSlot instanceof SqrlFixedSlot && oldSlot.replaceable)
      ) {
        this.slots[ast.feature] = new SqrlFeatureSlot(ast.feature);
      }
      const slot = this.slots[ast.feature];
      if (!(slot instanceof SqrlFeatureSlot)) {
        throw buildSqrlError(ast, "Feature was previously defined");
      }

      slot.mergeGlobal(ast, this.globalWhere, (ast: Ast, globalWhere: Ast) =>
        this.combineWithProvidedGlobalWhere(ast, globalWhere)
      );
    } else if (ast.type === "rule") {
      if (!this.slotIsEmpty(ast.name)) {
        throw buildSqrlError(ast, "Feature was previously defined");
      }
      const slot = new SqrlRuleSlot(ast.name);
      this.slots[ast.name] = slot;
      slot.setRule(ast as RuleAst, this.globalWhere);
    } else {
      this._pushStatement(ast);
    }
  }

  setPushStatement(pushStatement) {
    this._pushStatement = pushStatement;
  }

  slotIsEmpty(name: string): boolean {
    if (!this.slots.hasOwnProperty(name)) {
      return true;
    } else if (this.slots[name] instanceof SqrlEmptySlot) {
      return true;
    } else {
      return false;
    }
  }
  hasSlot(name) {
    return this.slots.hasOwnProperty(name);
  }

  getSlot(name: string): SqrlSlot {
    invariant(this.hasSlot(name), "Could not find named slot:: %s", name);
    return this.slots[name];
  }

  getFeatureSlot(sourceAst: Ast, name: string): SqrlFeatureSlot {
    if (!this.hasSlot(name)) {
      throw buildSqrlError(sourceAst, "Could not find feature: %s", name);
    }
    const slot = this.slots[name];
    if (!(slot instanceof SqrlFeatureSlot)) {
      throw new Error("Expected feature slot: " + name);
    }
    return slot;
  }

  ensureAllSlots(slotNames: string[]): void {
    slotNames.forEach(name => {
      if (!this.slots.hasOwnProperty(name)) {
        this.slots[name] = new SqrlEmptySlot(name);
      }
    });
  }

  astContainsCurrentIterator(ast: Ast): boolean {
    let seenIterator = false;
    walkAst(ast, node => {
      if (node.type === "iterator") {
        seenIterator = true;
      }
    });
    return seenIterator;
  }

  ensureStatementFeature(
    sourceAst: Ast,
    featureName: string
  ): SqrlStatementSlot {
    if (this.slots.hasOwnProperty(featureName)) {
      const slot = this.slots[featureName];
      if (!(slot instanceof SqrlStatementSlot)) {
        throw new Error("Expected statement slot: " + featureName);
      }
      return slot;
    } else {
      return this.addStatementFeature(sourceAst, featureName);
    }
  }

  addWhenStatement(
    sourceAst: Ast,
    basicLabelOperations,
    ast: Ast,
    name: string | null = null
  ) {
    const registeredCall = SqrlAst.registerCall(ast);

    this.addStatement(sourceAst, "SqrlWhenStatements", registeredCall, name);
    basicLabelOperations.forEach(labelOperation => {
      const waitNames = labelOperationWaitNames(labelOperation);
      waitNames.forEach(waitName => {
        this.ensureStatementFeature(sourceAst, waitName);
        this.addStatement(sourceAst, waitName, registeredCall);
      });
    });
  }

  addCallStatement(sourceAst, ast: CallAst) {
    this.functionRegistry.assertStatementAst(ast);
    const statementFeature = this.functionRegistry.statementFeature(ast.func);
    return this.addStatement(
      sourceAst,
      statementFeature,
      SqrlAst.registerCall(ast)
    );
  }

  addStatement(
    sourceAst: Ast,
    globalName: string,
    ast: Ast,
    name: string = null
  ): SlotAst {
    const slotAst: SlotAst = this.newGlobal(sourceAst, ast, name);
    invariant(
      this.slots.hasOwnProperty(slotAst.slotName),
      "Could not find given slot"
    );
    invariant(
      this.slots.hasOwnProperty(globalName),
      "Could not find global for statement:: %s",
      globalName
    );

    this.addStatementSlot(globalName, slotAst);

    return slotAst;
  }

  addStatementSlot(globalName: string, slotAst: SlotAst) {
    const slot = this.slots[globalName];
    if (!(slot instanceof SqrlStatementSlot)) {
      throw new Error("Expected statement slot: " + globalName);
    }
    slot.addWait(slotAst.slotName);
  }

  newGlobal(sourceAst: Ast, ast: Ast, name: string = null): SlotAst {
    invariant(typeof sourceAst === "object", "Expected object sourceAst");
    invariant(typeof ast === "object", "Expected object ast");

    sqrlInvariant(
      sourceAst,
      this.currentIterator === null || !this.astContainsCurrentIterator(ast),
      "Expression is not valid during a list comprehension"
    );

    // transform globals before saving to slot
    ast = SqrlAst.branch(this.globalWhere, this.transform(ast), null);

    // If we got this far give the global a name based on its ast slot
    if (!name) {
      name = "ast:" + SqrlAst.hash(ast);
    }

    // If the global already exists ensure it is unique, otherwise create a new
    // global with the given name.
    if (!this.slotIsEmpty(name)) {
      const slot = this.slots[name];
      if (!(slot instanceof SqrlFixedSlot)) {
        throw new Error("expected fixed slot for: " + name);
      }
      if (!SqrlAst.areEqual(ast, slot.finalizedAst())) {
        throw new Error(
          "Slots saved with the same name must be identical:: " +
            `${name} [${jsonAst(slot.finalizedAst())} != ${jsonAst(ast)}]`
        );
      }
    } else {
      this.slots[name] = new SqrlFixedSlot(name, ast);
    }

    return SqrlAst.slot(this.getSlot(name));
  }

  addStatementFeature(ast: Ast, featureName: string): SqrlStatementSlot {
    if (this.slots.hasOwnProperty(featureName)) {
      throw buildSqrlError(ast, "Feature already exists: " + featureName);
    }
    const slot = new SqrlStatementSlot(featureName);
    this.slots[featureName] = slot;
    return slot;
  }

  ensureConstantSlot(
    sourceAst: Ast,
    name: string,
    value: any
  ): SqrlConstantSlot {
    if (this.slots.hasOwnProperty(name)) {
      const slot = this.slots[name];
      if (!(slot instanceof SqrlConstantSlot)) {
        throw new Error("Expected SqrlConstantSlot for " + name);
      }
      return slot;
    } else {
      const slot = new SqrlConstantSlot(name, value);
      this.slots[name] = slot;
      return slot;
    }
  }

  ensureGlobalWithoutWhere(
    sourceAst: Ast,
    name: string,
    callback: () => Ast
  ): SqrlSlot {
    if (!this.slots.hasOwnProperty(name)) {
      const rv = callback();
      this.newGlobalWithoutWhere(sourceAst, rv as Ast, name);
      return this.slots[name];
    }
    return this.slots[name];
  }

  newGlobalWithoutWhere(
    sourceAst: Ast,
    ast: Ast,
    name: string = null
  ): SlotAst {
    return this.withoutGlobalWhere(() => this.newGlobal(sourceAst, ast, name));
  }

  printFeatureLoop(slot: SqrlSlot) {
    const current: Set<string> = new Set();

    const results = [];
    const printLevel = (slot: SqrlSlot, prefix: string = "") => {
      if (current.has(slot.name)) {
        // console.log(prefix + ' ! ' + colored('red', slot.name));
        results.push(prefix + slot.name);
        return;
      }

      // console.log(prefix + ' > ' + slot.name);

      const add = !current.has(slot.name);
      if (add) {
        current.add(slot.name);
      }

      astSlotNames(slot.finalizedAst()).forEach(slotName => {
        printLevel(this.slots[slotName], prefix + slot.name + " > ");
      });

      if (add) {
        current.delete(slot.name);
      }
    };

    printLevel(slot);
    return results;
  }

  combineWithProvidedGlobalWhere(
    whereAst: Ast,
    globalWhere: Ast
  ): {
    combinedAst: Ast;
    whereAst: Ast;
    whereFeatures: string[];
    whereTruth: string;
  } {
    // Merge with the global where, but take location from ast
    const combinedAst = SqrlAst.and(globalWhere, whereAst);
    combinedAst.location = whereAst.location;

    const {
      features: whereFeatures,
      truthTable: whereTruth
    } = reduceTruthTable(combinedAst);

    whereAst = SqrlAst.bool(combinedAst);

    if (whereAst.type !== "constant") {
      const whereBoolName = `bool(${whereFeatures.join(",")}:${whereTruth})`;

      // We skip out on newGlobal's ast comparison here since we don't (yet)
      // reduce bool clauses so bool(A && (A)) will have the same name/truth table
      // as bool(A) even though the result is identical
      if (this.slots.hasOwnProperty(whereBoolName)) {
        whereAst = SqrlAst.slot(this.getSlot(whereBoolName));
      } else {
        whereAst = this.newGlobalWithoutWhere(
          whereAst,
          SqrlAst.bool(combinedAst),
          whereBoolName
        );
      }
    }

    return { combinedAst, whereAst, whereFeatures, whereTruth };
  }

  combineGlobalWhere(whereAst: Ast) {
    return this.combineWithProvidedGlobalWhere(whereAst, this.globalWhere);
  }

  transform(ast: Ast): Ast {
    if (!this._astTransformer) {
      this._astTransformer = new SqrlAstTransformer(this);
    }

    return this._astTransformer.transform(ast);
  }

  withoutGlobalWhere<T>(callback: () => T): T {
    const prevWhere: Ast = this.globalWhere;
    this.globalWhere = SqrlAst.constant(true);
    const result: T = callback();
    this.globalWhere = prevWhere;
    return result;
  }

  wrapWhere<T>(whereAst: Ast, callback: () => T): T {
    // Run a reduce on this ast to ensure that we can reduce it
    reduceTruthTable(whereAst);

    const prevWhere = this.globalWhere;
    this.globalWhere = SqrlAst.and(this.globalWhere, whereAst);
    const result: T = callback();
    this.globalWhere = prevWhere;
    return result;
  }

  wrapIterator<T>(iterator: string, callback: () => T): T {
    invariant(
      this.currentIterator === null,
      "Multiple levels of iterators are not supported."
    );
    this.currentIterator = iterator;
    const result: T = callback();
    this.currentIterator = null;
    return result;
  }

  serialize(): SqrlSerialized {
    return {
      slots: mapObject(this.slots, slot => slot.serialize())
    };
  }

  extractDataObjectConstantKeys(ast) {
    sqrlInvariant(
      ast,
      SqrlAst.isSimpleDataObject(ast),
      "Expected argument to be object with constant keys"
    );

    if (ast.type === "constant" && typeof ast.value === "object") {
      return Object.keys(ast.value);
    }

    const keys = [];
    for (let idx = 0; idx < ast.args.length; idx += 2) {
      const arg = ast.args[idx];
      sqrlInvariant(
        arg,
        arg.type === "constant" && typeof arg.value === "string",
        "Expected constant string key for object here"
      );
      keys.push(arg.value);
    }
    return keys;
  }

  extractListConstantStrings(ast: ListAst): string[] {
    sqrlInvariant(ast, ast.type === "list", "Expected list");

    return ast.exprs.map(e => {
      if (e.type !== "constant" || typeof e.value !== "string") {
        throw buildSqrlError(ast, "Expected constant string here");
      }
      return e.value;
    });
  }

  interpretCounterCallAst(
    ast: CallAst
  ): {
    args: Ast;
    whereAst: Ast;
    whereFeatures?: string[];
    whereTruth?: string;
  } {
    if (ast.type !== "call") {
      throw new Error("Cannot interpret non-function call:: " + ast.type);
    }

    sqrlInvariant(
      ast,
      ast.args.length === 2,
      `${ast.func}() function requires keyword arguments`
    );

    const args: Ast = ast.args[0];
    const { whereAst, whereFeatures, whereTruth } = this.combineGlobalWhere(
      ast.args[1]
    );

    const rv = { args, whereAst };
    if (whereTruth !== "") {
      Object.assign(rv, { whereFeatures, whereTruth });
    }
    return rv;
  }

  constantNodeAst(sourceAst: Ast, type: string, key: string): SlotAst {
    const nodeAst = SqrlAst.call("node", SqrlAst.constants(type, key));
    return this.withoutGlobalWhere(() =>
      this.newGlobal(sourceAst, nodeAst, `node(${type}/${key})`)
    );
  }

  counterNode(
    sourceAst: Ast,
    nodeType: string,
    props: {
      [key: string]: any;
    }
  ) {
    const nodeKey = murmurhashJsonHexSync(props);
    const nodeId = new NodeId(nodeType, nodeKey);
    const nodeAst = this.constantNodeAst(sourceAst, nodeId.type, nodeId.key);
    return { nodeId, nodeAst };
  }
}
