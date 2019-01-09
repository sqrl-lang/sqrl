export * from "./RenderedSpan";
export * from "./SqrlObject";

export * from "./compare";
export * from "./emptyFunction";
export * from "./ensureArray";
export * from "./flatten";
export * from "./foreachObject";
export * from "./hasConstructor";
export * from "./invariant";
export * from "./isEmptyObject";
export * from "./jsonTemplate";
export * from "./mapObject";
export * from "./promiseFinally";
export * from "./range";
export * from "./sqrlCartesianProduct";

export interface AssertService {
  compare(left: any, operator: string, right: any, arrow: string): void;
  ok(value: any, arrow: string): void;

  throwFirstError?(): void;
}
