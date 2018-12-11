/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Helper class to construct new Ast objects
 */
export class AstBuilder {
  static constant(value: any): ConstantAst {
    return {
      type: "constant",
      value
    };
  }
}

/**
 * Indicates the location of the Ast within source code
 */
export interface AstLocation {
  source?: string;
  filename?: string;
  start: {
    line: number;
    offset: number;
    column: number;
  };
  end: {
    line: number;
    offset: number;
    column: number;
  };
}

export interface BaseAst {
  type: string;
  location?: AstLocation;
  json?: Buffer;
}

export interface ConstantAst extends BaseAst {
  type: "constant";
  value: any;
}

export interface ReplAst extends BaseAst {
  type: "repl";
  statements: (ExprAst | StatementAst)[];
}
export interface ScriptAst extends BaseAst {
  type: "script";
  statements: StatementAst[];
}
export interface SwitchAst extends BaseAst {
  type: "switch";
  defaultCase: Ast;
  cases: SwitchCaseAst[];
}
export interface SwitchCaseAst extends BaseAst {
  type: "switchCase";
  ast: Ast;
  expr: Ast;
  where: Ast;
  truthTableWhere: Ast;
}
export interface ListComprehensionAst extends BaseAst {
  type: "listComprehension";
  output: Ast;
  input: Ast;
  iterator: IteratorAst;
  where: Ast;
}

export interface ExprAst extends BaseAst {
  type: "expr";
  expr: Ast;
}

export interface BinaryExprAst extends BaseAst {
  type: "boolean_expr" | "binary_expr";
  left: Ast;
  operator: string;
  right: Ast;
}
export interface NoopAst extends BaseAst {
  type: "noop";
}
export interface LetAst extends BaseAst {
  type: "let";

  final: boolean;
  description: string | null;
  expr: Ast;
  feature: string;
  isDefaultCase: boolean;

  where: Ast;
}

export interface ExecuteAst extends BaseAst {
  type: "execute";
  repeat: number;
  skipWait: boolean;
}

export interface FeatureAst extends BaseAst {
  type: "feature";
  value: string;
}

export interface AliasFeatureAst extends BaseAst {
  type: "aliasFeature";
  value: string;
  alias: string;
}

export type CountValidTimespan =
  | "dayOverDay"
  | "dayOverWeek"
  | "lastDay"
  | "lastEightDays"
  | "lastHour"
  | "lastMonth"
  | "last180Days"
  | "lastTwoDays"
  | "lastTwoWeeks"
  | "lastWeek"
  | "total"
  | "weekOverWeek"
  | "previousLastDay"
  | "previousLastWeek"
  | "dayWeekAgo";

export interface CountArgsAst extends BaseAst {
  type: "countArgs";
  features: AliasFeatureAst[];
  sumFeature?: FeatureAst;
  timespan: CountValidTimespan;
}

export interface RulesAst extends BaseAst {
  type: "rules";
  rules: FeatureAst[];
}

export interface RuleAst extends BaseAst {
  type: "rule";
  name: string;
  description: string | null;
  where: Ast;
  reason: string;
}

export interface ListAst extends BaseAst {
  type: "list";
  exprs: Ast[];
}

export interface PercentileArgsAst extends BaseAst {
  type: "percentileArgs";
  groupFeatures?: string[];
  feature: string;
  percentile: number;
}
export interface RateLimitArgsAst extends BaseAst {
  type: "rateLimitArgs";
  features: string[];
  maxAmount: number;
  refillTimeMs: number;
  refillAmount: number;
  tokenAmount: Ast;
  strict: boolean;
}
export interface CountUniqueArgsAst extends BaseAst {
  type: "countUniqueArgs";
  uniques: AliasFeatureAst[];
  groups: AliasFeatureAst[];
  setOperation: null | {
    operation: string;
    features: string[];
  };
  windowMs: number | null;
  beforeAction: boolean;
}

export type TrendingValidTimespan =
  | "dayOverDay"
  | "weekOverWeek"
  | "dayOverFullWeek";

export interface TrendingArgsAst extends BaseAst {
  type: "trendingArgs";
  features: AliasFeatureAst[];
  minEvents: number;
  timespan: TrendingValidTimespan;
}

export interface CallAst extends BaseAst {
  type: "call";
  func: string;
  args: Ast[];
}

export interface RegisteredCallAst extends BaseAst {
  type: "registeredCall";
  func: string;
  args: Ast[];
}

export interface IfAst extends BaseAst {
  type: "if";
  condition: Ast;
  trueBranch: Ast;
  falseBranch: Ast | null;
}

export interface StateAst extends BaseAst {
  type: "state";
}

export interface WhenContextAst extends BaseAst {
  type: "whenContext";
  slotName?: string;
}

export interface IteratorAst extends BaseAst {
  type: "iterator";
  name: string;
}

export interface WhenAst extends BaseAst {
  type: "when";
  rules: RulesAst;
  statements: CallStatementAst[];
}

export interface PriorityAst extends BaseAst {
  type: "priority";
  priority: "eager" | "lazy";
  expr: Ast;
}

export interface AssertAst extends BaseAst {
  type: "assert";
  expr: Ast;
}
export interface IncludeAst extends BaseAst {
  type: "include";
  filename: string;
  where: Ast;
}

export interface StreamingStatArgsAst extends BaseAst {
  type: "streamingStatArgs";
  feature: string;
  group: string;
}

export interface NotAst extends BaseAst {
  type: "not";
  expr: Ast;
}

export interface SlotAst extends BaseAst {
  type: "slot";
  slotName: string;
}

export type CallStatementAst = CallAst;

export type StatementAst =
  | AssertAst
  | ExecuteAst
  | IncludeAst
  | LetAst
  | RuleAst
  | WhenAst
  | ListComprehensionAst
  | CallAst;

export type Ast =
  | ConstantAst
  | StateAst
  | SlotAst
  | NotAst
  | ScriptAst
  | FeatureAst
  | ListComprehensionAst
  | LetAst
  | ExecuteAst
  | AssertAst
  | IteratorAst
  | BinaryExprAst
  | ExprAst
  | IncludeAst
  | CountArgsAst
  | NoopAst
  | RuleAst
  | ListAst
  | PercentileArgsAst
  | RateLimitArgsAst
  | CountUniqueArgsAst
  | TrendingArgsAst
  | RulesAst
  | CallAst
  | IfAst
  | SwitchAst
  | SwitchCaseAst
  | StreamingStatArgsAst
  | RegisteredCallAst
  | AliasFeatureAst
  | PriorityAst
  | ReplAst
  | WhenAst
  | WhenContextAst;
