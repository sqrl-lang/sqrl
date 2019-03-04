/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export interface RuleSpec {
  name: string;
  reason: string;
  features: string[];
}
export interface RuleSpecMap {
  [ruleName: string]: RuleSpec;
}

export interface FeatureDefinitionLocation {
  line: number;
  offset: number;
  column: number;
}

export interface FeatureDefinition {
  start: FeatureDefinitionLocation;
  end: FeatureDefinitionLocation;
  filename: string;
  source: string;
  description?: string;
  includedWhere?: string;
  features: (string | null)[];
}

export interface FeatureDoc {
  name: string;
  definitions: FeatureDefinition[];
  cost: number;
  recursiveCost: number;
}

export interface FeatureDocMap {
  [name: string]: FeatureDoc;
}

/**
 * Specification to load a compiled SQRL file into the JavaScript runtime.
 * The optional fields are not required for the runtime, but are used elsewhere.
 */
export interface ExecutableSpec {
  rules: RuleSpecMap;
  features?: FeatureDocMap;
  usedFiles: string[];

  slotNames: string[];
  slotJs: string[];
  slotCosts: number[];
  slotRecursiveCosts: number[];
}
