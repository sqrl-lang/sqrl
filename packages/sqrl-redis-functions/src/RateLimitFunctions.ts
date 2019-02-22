/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import {
  Ast,
  AstBuilder,
  CallAst,
  Context,
  FunctionRegistry,
  CompileState,
  SqrlKey,
  AT,
  Execution,
  sqrlInvariant,
  SqrlSession,
  SqrlObject,
  CustomCallAst
} from "sqrl";

import { flatten } from "sqrl-common";
import { RateLimitArguments } from "./parser/sqrlRedis";
import { parse } from "./parser/sqrlRedisParser";

export interface RateLimitRefill {
  maxAmount: number;
  refillTimeMs: number;
  refillAmount: number;
  take: number;
  at: number;
  strict: boolean;
}

export interface RateLimitProps extends RateLimitRefill {
  keys: SqrlKey[];
}
export interface SessionProps extends RateLimitRefill {
  key: SqrlKey;
}

export interface RateLimitService {
  fetch(ctx: Context, props: RateLimitProps): Promise<number[]>;
  sessionize(ctx: Context, props: SessionProps): Promise<number>;
}

function setupRateLimitAst(state: CompileState, ast: CustomCallAst) {
  const args: RateLimitArguments = parse(ast.source, {
    startRule: "RateLimitArguments"
  });
  const { whereAst, whereFeatures, whereTruth } = state.combineGlobalWhere(
    args.where
  );

  const tokenAmountAst = state.setGlobal(
    ast,
    AstBuilder.branch(
      whereAst,
      AstBuilder.call("_getTokenAmount", [args.tokenAmount]),
      AstBuilder.constant(0)
    )
  );
  const { nodeId, nodeAst } = state.addHashedNode(ast, "RateLimit", {
    whereFeatures,
    whereTruth,
    features: args.features,
    maxAmount: args.maxAmount,
    refillTimeMs: args.refillTimeMs,
    refillAmount: args.refillAmount
  });

  const keysAst = state.setGlobal(
    ast,
    AstBuilder.call("_getKeyList", [nodeAst, ...args.features]),
    `key(${nodeId.getIdString()})`
  );

  // Convert the amount to be taken into a new global, this allows the
  // entire array below to be pre-computed.
  const takeAst = state.setGlobal(
    ast,
    AstBuilder.branch(
      AstBuilder.feature("SqrlMutate"),
      tokenAmountAst,
      AstBuilder.constant(0)
    )
  );

  const redisResults = state.setGlobal(
    ast,
    AstBuilder.call("_fetchRateLimit", [
      AstBuilder.props({
        keys: keysAst,
        maxAmount: AstBuilder.constant(args.maxAmount),
        refillTimeMs: AstBuilder.constant(args.refillTimeMs),
        refillAmount: AstBuilder.constant(args.refillAmount),
        take: takeAst,
        at: AstBuilder.call("timeMs", [AstBuilder.feature("SqrlClock")]),
        strict: AstBuilder.constant(args.strict)
      })
    ])
  );
  const resultsAst = state.setGlobal(
    ast,
    AstBuilder.call("intMap", [redisResults]),
    nodeId.getIdString()
  );
  return { keysAst, resultsAst };
}

export function registerRateLimitFunctions(
  registry: FunctionRegistry,
  service: RateLimitService
) {
  registry.register(
    async function _fetchRateLimit(state: Execution, props) {
      if (props.keys === null) {
        return null;
      }
      return service.fetch(state.ctx, props);
    },
    {
      args: [AT.state, AT.any],
      allowSqrlObjects: true
    }
  );

  registry.register(
    async function _fetchSession(state, props) {
      if (props.keys === null) {
        return null;
      }
      return service.sessionize(state.ctx, props);
    },
    {
      args: [AT.state, AT.any],
      allowSqrlObjects: true
    }
  );

  registry.registerSync(
    function _parseInt(val) {
      return typeof val !== "number" ? null : Math.floor(val);
    },
    {
      pure: true
    }
  );

  registry.registerTransform(
    function _getTokenAmount(state: CompileState, ast: CallAst): Ast {
      const tokenAmountAst = ast.args[0];
      sqrlInvariant(
        ast,
        tokenAmountAst.type === "feature" || tokenAmountAst.type === "constant",
        `If specifying take amount it must be a constant or a feature.`
      );
      return AstBuilder.call("_parseInt", ast.args);
    },
    {
      args: [AT.any]
    }
  );

  registry.registerCustom(function rateLimit(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const resultsAst = setupRateLimitAst(state, ast).resultsAst;
    return AstBuilder.call("listMin", [resultsAst]);
  });

  registry.registerSync(
    function _rateLimitedValues(state, keys, results) {
      if (keys.length !== results.length) {
        state.error({}, "Mismatched # of keys and results");
        return null;
      }
      return flatten(
        results
          .map((result, i) => {
            if (result === 0) {
              return keys[i].getFeatureValues();
            }
          })
          .filter(v => v)
      );
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any]
    }
  );

  registry.registerCustom(function rateLimitedValues(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const { resultsAst, keysAst } = setupRateLimitAst(state, ast);
    return AstBuilder.call("_rateLimitedValues", [keysAst, resultsAst]);
  });

  registry.registerCustom(function rateLimited(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const args: RateLimitArguments = parse(ast.source, {
      startRule: "RateLimitArguments"
    });
    const { whereAst } = state.combineGlobalWhere(args.where);

    const resultsAst = setupRateLimitAst(state, ast).resultsAst;
    const rateLimitValue = state.setGlobal(
      ast,
      AstBuilder.call("listMin", [resultsAst])
    );

    const tokenAmountAst = state.setGlobal(
      ast,
      AstBuilder.branch(
        whereAst,
        AstBuilder.call("_getTokenAmount", [args.tokenAmount]),
        AstBuilder.constant(0)
      )
    );

    return AstBuilder.branch(
      // if tokenAmount > 0
      AstBuilder.call("cmpG", [tokenAmountAst, AstBuilder.constant(0)]),
      // then return rateLimit < tokenAmount
      AstBuilder.call("cmpL", [rateLimitValue, tokenAmountAst]),
      // else return rateLimit <= 0
      AstBuilder.call("cmpLE", [rateLimitValue, AstBuilder.constant(0)])
    );
  });

  registry.registerSync(
    function _sessionize(key, startMs) {
      startMs = SqrlObject.ensureBasic(startMs);
      return new SqrlSession(key, startMs);
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.registerCustom(function sessionize(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const args: RateLimitArguments = parse(ast.source, {
      startRule: "RateLimitArguments"
    });
    const { whereAst, whereFeatures, whereTruth } = state.combineGlobalWhere(
      args.where
    );

    const tokenAmountAst = state.setGlobal(
      ast,
      AstBuilder.branch(
        whereAst,
        AstBuilder.call("_getTokenAmount", [args.tokenAmount]),
        AstBuilder.constant(0)
      )
    );

    const { nodeId, nodeAst } = state.addHashedNode(ast, "Sessionize", {
      whereFeatures,
      whereTruth,
      features: args.features,
      maxAmount: args.maxAmount,
      refillTimeMs: args.refillTimeMs,
      refillAmount: args.refillAmount
    });

    const keyAst = state.setGlobal(
      ast,
      AstBuilder.call("_buildKey", [nodeAst, ...args.features]),
      `key(${nodeId.getIdString()})`
    );

    // Convert the amount to be taken into a new global, this allows the
    // entire array below to be pre-computed.
    const takeAst = state.setGlobal(
      ast,
      AstBuilder.branch(
        AstBuilder.feature("SqrlMutate"),
        tokenAmountAst,
        AstBuilder.constant(0)
      )
    );

    const sessionTimestampSlot = state.setGlobal(
      ast,
      AstBuilder.call("_fetchSession", [
        AstBuilder.props({
          key: keyAst,
          maxAmount: AstBuilder.constant(args.maxAmount),
          refillTimeMs: AstBuilder.constant(args.refillTimeMs),
          refillAmount: AstBuilder.constant(args.refillAmount),
          take: takeAst,
          at: AstBuilder.call("timeMs", [AstBuilder.feature("SqrlClock")])
        })
      ])
    );

    return AstBuilder.call("_sessionize", [
      keyAst, // Key for the session rate limit
      sessionTimestampSlot
    ]);
  });
}
