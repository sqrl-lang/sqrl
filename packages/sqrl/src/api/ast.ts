/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export { AstBuilder } from "../helpers/AstBuilder";

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

export interface CallAst extends BaseAst {
  type: "call";
  func: string;
  args: Ast[];
}

export interface CustomCallAst extends BaseAst {
  type: "customCall";
  func: string;
  source: string;
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

export interface WhenCauseAst extends BaseAst {
  type: "whenCause";
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
  | CustomCallAst
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
  | RuleAst
  | ListAst
  | RulesAst
  | CallAst
  | IfAst
  | SwitchAst
  | SwitchCaseAst
  | RegisteredCallAst
  | PriorityAst
  | ReplAst
  | WhenAst
  | WhenCauseAst;
