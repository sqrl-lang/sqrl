import { FeatureAst, Ast } from "sqrl";

export interface AliasedFeature {
  feature: FeatureAst;
  alias: string;
}

export interface CountArguments {
  features: AliasedFeature[];
  sumFeature: FeatureAst | null;
  timespan: string;
  where: Ast;
}

export interface TrendingArguments {
  features: AliasedFeature[];
  minEvents: number;
  timespan: string;
  where: Ast;
}

export interface CountUniqueArguments {
  uniques: AliasedFeature[];
  groups: AliasedFeature[];
  setOperation: {
    operation: string;
    features: AliasedFeature[];
  };
  where: Ast;
  windowMs: number | null;
  beforeAction: boolean;
}

export interface RateLimitArguments {
  features: FeatureAst[];
  maxAmount: number;
  refillTimeMs: number;
  refillAmount: number;
  tokenAmount: Ast;
  strict: boolean;
  where: Ast;
}
