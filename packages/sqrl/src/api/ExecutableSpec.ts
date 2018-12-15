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

export interface ExecutableSpec {
  ruleSpec: RuleSpecMap;
  usedFiles: string[];

  slotNames: string[];
  slotJs: string[];
  slotCosts: number[];
  slotRecursiveCosts: number[];
}
