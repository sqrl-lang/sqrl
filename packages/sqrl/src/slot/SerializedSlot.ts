/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlSlot } from "./SqrlSlot";
import { FeatureDefinition } from "../api/spec";

export interface SerializedSlotBase {
  class: string;
  name: string;
}
export interface SerializedConstantSlot extends SerializedSlotBase {
  class: "SqrlConstantSlot";
  ast: any;
}
export interface SerializedIteratorSlot extends SerializedSlotBase {
  class: "SqrlIteratorSlot";
}
export interface SerializedStatementSlot extends SerializedSlotBase {
  class: "SqrlStatementSlot";
  referencedSlots: string[];
}
export interface SerializedFixedSlot extends SerializedSlotBase {
  class: "SqrlFixedSlot";
  ast: any;
  replaceable: boolean;
}

export interface SerializedFeatureSlot extends SerializedSlotBase {
  class: "SqrlFeatureSlot";
  definitions: FeatureDefinition[];
  final: boolean;
  ast: any;
  where: any;
  ruleSpec: any;
}

export interface SerializedRuleSlot extends SerializedSlotBase {
  class: "SqrlRuleSlot";
  definition: FeatureDefinition;
  ast: any;
  where: any;
  ruleSpec: any;
}

export type SerializedSlot =
  | SerializedConstantSlot
  | SerializedFixedSlot
  | SerializedIteratorSlot
  | SerializedFeatureSlot
  | SerializedRuleSlot
  | SerializedStatementSlot;

const constructors: { [name: string]: any } = {};
export function registerSlotClass(classConstructor: any) {
  constructors[classConstructor.name] = classConstructor;
}

export function deserializeSlot(serialized: SerializedSlot): SqrlSlot {
  const classConstructor = constructors[serialized.class];
  const obj: SqrlSlot = Object.create(classConstructor.prototype);
  obj.deserializor(serialized);
  return obj;
}
