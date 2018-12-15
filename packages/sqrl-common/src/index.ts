export * from "./compare";
export * from "./ensureArray";
export * from "./foreachObject";
export * from "./hasConstructor";
export * from "./flatten";
export * from "./invariant";
export * from "./jsonTemplate";
export * from "./range";
export * from "./isEmptyObject";
export * from "./emptyFunction";
export * from "./mapObject";
export * from "./RenderedSpan";
export * from "./SqrlObject";
export * from "./sqrlCartesianProduct";

export interface AssertService {
  compare(left: any, operator: string, right: any, arrow: string): void;
  ok(value: any, arrow: string): void;

  throwFirstError?(): void;
}
