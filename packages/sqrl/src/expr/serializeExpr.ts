/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Expr } from "./Expr";

interface SerializedExpr {
  load: number[];
  exprs: SerializedExpr[];
  [key: string]: any;
}

export function serializeExpr(expr: Expr): SerializedExpr {
  return Object.assign({}, expr, {
    slot: (expr as any).slot ? (expr as any).slot.getIndex() : undefined,
    exprs: expr.exprs ? expr.exprs.map(serializeExpr) : undefined,
    load: expr.load ? expr.load.map(slot => slot.getIndex()) : undefined,
    location: undefined
  });
}
