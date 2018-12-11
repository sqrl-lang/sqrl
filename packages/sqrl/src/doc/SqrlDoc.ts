/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export interface SqrlDefinitionLocation {
  line: number;
  offset: number;
  column: number;
}

export interface SqrlDocDefinition {
  start: SqrlDefinitionLocation;
  end: SqrlDefinitionLocation;
  filename: string;
  source: string;
  description?: string;
  includedWhere?: string;
  features: (string | null)[];
}

export interface FilePosition {
  line: number;
  offset: number;
  column: number;
}

export interface SqrlDocLocation {
  filename: string;
  start: FilePosition;
  end: FilePosition;
  source: string;
}

export interface SqrlFeatureDoc {
  name: string;
  definitions: SqrlDocLocation[];
  cost: number;
  recursiveCost: number;
}
export interface CostProps {
  cost: number;
  recursiveCost: number;
}
