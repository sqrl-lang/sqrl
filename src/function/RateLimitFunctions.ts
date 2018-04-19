/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";

import { default as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import SqrlObject from "../object/SqrlObject";
import SqrlSession from "../object/SqrlSession";
import { buildSqrlError, sqrlInvariant } from "../api/parse";
import { SqrlParserState } from "../compile/SqrlParserState";
import flatten from "../jslib/flatten";
import SqrlKey from "../object/SqrlKey";
import { Context } from "../api/ctx";

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
  sessionize(ctx: Context, props: SessionProps): Promise<[number, number]>;
}

function setupRateLimitAst(state: SqrlParserState, ast) {
  const {
    args,
    whereAst,
    whereFeatures,
    whereTruth
  } = state.interpretCounterCallAst(ast);
  if (args.type !== "rateLimitArgs") {
    throw buildSqrlError(ast, "rate limit functions require keyword arguments");
  }

  const tokenAmountAst = state.newGlobal(
    ast,
    SqrlAst.branch(
      whereAst,
      SqrlAst.call("_getTokenAmount", [ast.args[0].tokenAmount]),
      SqrlAst.constant(0)
    )
  );
  const { nodeId, nodeAst } = state.counterNode(ast, "RateLimit", {
    whereFeatures,
    whereTruth,
    features: args.features,
    maxAmount: args.maxAmount,
    refillTimeMs: args.refillTimeMs,
    refillAmount: args.refillAmount
  });

  const keysAst = state.newGlobal(
    ast,
    SqrlAst.call("_getKeyList", [
      nodeAst,
      ...SqrlAst.features(...args.features)
    ]),
    `key(${nodeId.getIdString()})`
  );

  // Convert the amount to be taken into a new global, this allows the
  // entire array below to be pre-computed.
  const takeAst = state.newGlobal(
    ast,
    SqrlAst.branch(
      SqrlAst.feature("SqrlMutate"),
      tokenAmountAst,
      SqrlAst.constant(0)
    )
  );

  const redisResults = state.newGlobal(
    ast,
    SqrlAst.call("_fetchRateLimit", [
      SqrlAst.props({
        keys: keysAst,
        maxAmount: SqrlAst.constant(args.maxAmount),
        refillTimeMs: SqrlAst.constant(args.refillTimeMs),
        refillAmount: SqrlAst.constant(args.refillAmount),
        take: takeAst,
        at: SqrlAst.feature("SqrlClock"),
        strict: SqrlAst.constant(args.strict)
      })
    ])
  );
  const resultsAst = state.newGlobal(
    ast,
    SqrlAst.call("intMap", [redisResults]),
    nodeId.getIdString()
  );
  return { keysAst, resultsAst };
}

export function registerRateLimitFunctions(
  registry: FunctionRegistry,
  service: RateLimitService
) {
  registry.save(
    async function _fetchRateLimit(state, props) {
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

  registry.save(
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

  registry.save(
    function _parseInt(val) {
      return typeof val !== "number" ? null : Math.floor(val);
    },
    {
      pure: true
    }
  );

  registry.save(null, {
    name: "_getTokenAmount",
    args: [AT.any],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const tokenAmountAst = ast.args[0];
      sqrlInvariant(
        ast,
        tokenAmountAst.type === "feature" || tokenAmountAst.type === "constant",
        `If specifying take amount it must be a constant or a feature.`
      );
      return SqrlAst.call("_parseInt", ast.args);
    }
  });

  registry.save(null, {
    name: "rateLimit",
    async: true,
    stateArg: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const resultsAst = setupRateLimitAst(state, ast).resultsAst;
      return SqrlAst.call("listMin", [resultsAst]);
    }
  });

  registry.save(
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

  registry.save(null, {
    name: "rateLimitedValues",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const { resultsAst, keysAst } = setupRateLimitAst(state, ast);
      return SqrlAst.call("_rateLimitedValues", [keysAst, resultsAst]);
    }
  });

  registry.save(null, {
    name: "rateLimited",
    async: true,
    stateArg: true,
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const { args, whereAst } = state.interpretCounterCallAst(ast);
      if (args.type !== "rateLimitArgs") {
        throw buildSqrlError(ast, "sessionize() requires keyword arguments");
      }

      const rateLimitValue = state.newGlobal(
        ast,
        SqrlAst.call("rateLimit", ast.args)
      );

      const tokenAmountAst = state.newGlobal(
        ast,
        SqrlAst.branch(
          whereAst,
          SqrlAst.call("_getTokenAmount", [args.tokenAmount]),
          SqrlAst.constant(0)
        )
      );

      return SqrlAst.branch(
        // if tokenAmount > 0
        SqrlAst.call("cmpG", [tokenAmountAst, SqrlAst.constant(0)]),
        // then return rateLimit < tokenAmount
        SqrlAst.call("cmpL", [rateLimitValue, tokenAmountAst]),
        // else return rateLimit <= 0
        SqrlAst.call("cmpLE", [rateLimitValue, SqrlAst.constant(0)])
      );
    }
  });

  registry.save(
    function _sessionize(key, startMs) {
      startMs = SqrlObject.ensureBasic(startMs);
      return new SqrlSession(key, startMs);
    },
    {
      allowSqrlObjects: true,
      argCount: 2
    }
  );

  registry.save(null, {
    name: "sessionize",
    transformAst(state: SqrlParserState, ast): Ast {
      const {
        args,
        whereAst,
        whereFeatures,
        whereTruth
      } = state.interpretCounterCallAst(ast);
      if (args.type !== "rateLimitArgs") {
        throw buildSqrlError(ast, "sessionize() requires keyword arguments");
      }

      const tokenAmountAst = state.newGlobal(
        ast,
        SqrlAst.branch(
          whereAst,
          SqrlAst.call("_getTokenAmount", [args.tokenAmount]),
          SqrlAst.constant(0)
        )
      );

      const { nodeId, nodeAst } = state.counterNode(ast, "Sessionize", {
        whereFeatures,
        whereTruth,
        features: args.features,
        maxAmount: args.maxAmount,
        refillTimeMs: args.refillTimeMs,
        refillAmount: args.refillAmount
      });

      const keyAst = state.newGlobal(
        ast,
        SqrlAst.call("_buildKey40", [
          nodeAst,
          ...SqrlAst.features(...args.features)
        ]),
        `key(${nodeId.getIdString()})`
      );

      // Convert the amount to be taken into a new global, this allows the
      // entire array below to be pre-computed.
      const takeAst = state.newGlobal(
        ast,
        SqrlAst.branch(
          SqrlAst.feature("SqrlMutate"),
          tokenAmountAst,
          SqrlAst.constant(0)
        )
      );

      // Result here is an array containing remaining quota and update time ms.
      const redisResultsAst = state.newGlobal(
        ast,
        SqrlAst.call("_fetchSession", [
          SqrlAst.props({
            key: keyAst,
            maxAmount: SqrlAst.constant(args.maxAmount),
            refillTimeMs: SqrlAst.constant(args.refillTimeMs),
            refillAmount: SqrlAst.constant(args.refillAmount),
            take: takeAst,
            at: SqrlAst.feature("SqrlClock")
          })
        ])
      );

      const remainingQuotaAst = SqrlAst.call("int", [
        SqrlAst.call("first", [redisResultsAst])
      ]);
      const sessionStartMsAst = SqrlAst.call("last", [redisResultsAst]);
      const singletonSessionAst = SqrlAst.call("cmpG", [
        remainingQuotaAst,
        tokenAmountAst
      ]);
      const emptyTokenAmountAst = SqrlAst.call("cmpE", [
        SqrlAst.constant(0),
        tokenAmountAst
      ]);
      const invalidSessionAst = SqrlAst.call("or", [
        singletonSessionAst,
        emptyTokenAmountAst
      ]);

      return SqrlAst.branch(
        invalidSessionAst,
        SqrlAst.constant(null),
        SqrlAst.call("_sessionize", [
          keyAst, // Key for the session rate limit
          sessionStartMsAst
        ])
      );
    }
  });
}
