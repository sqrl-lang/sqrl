import { CompileState, Ast } from "sqrl";

export function interpretCounterWhere(
  state: CompileState,
  where: Ast
): {
  whereAst: Ast;
  whereFeatures?: string[];
  whereTruth?: string;
} {
  // @TODO: _wrapped
  return state._wrapped.combineGlobalWhere(where);
}
