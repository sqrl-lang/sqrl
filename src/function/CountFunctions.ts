/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  CountValidTimespan,
  CallAst,
  CountArgsAst,
  Ast,
  AliasFeatureAst
} from "../ast/Ast";
import bluebird = require("bluebird");
import { SqrlParserState } from "../compile/SqrlParserState";
import { buildSqrlError } from "../api/parse";
import SqrlAst from "../ast/SqrlAst";
import FunctionRegistry from "./FunctionRegistry";
import { default as AT } from "../ast/AstTypes";
import SqrlKey from "../object/SqrlKey";
import { Manipulator } from "../platform/Manipulator";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import invariant from "../jslib/invariant";
import { sqrlInvariant } from "../api/parse";

import { MAX_TIME_WINDOW_MS } from "../services/BucketedKeys";
import { Context } from "../api/ctx";

const NODE_TYPE = "Counter";

export const TIMESPAN_CONFIG = {
  lastHour: {
    suffix: "H",
    flag: 1,
    windowMs: 3600000
  },
  lastDay: {
    suffix: "D",
    flag: 2,
    windowMs: 3600000 * 24
  },
  lastWeek: {
    suffix: "W",
    flag: 4,
    windowMs: 3600000 * 24 * 7
  },
  lastMonth: {
    suffix: "M",
    flag: 8,
    windowMs: 3600000 * 24 * 30
  },
  total: {
    suffix: "T",
    flag: 16,
    windowMs: MAX_TIME_WINDOW_MS
  },
  lastTwoDays: {
    suffix: "D2",
    flag: 32,
    windowMs: 3600000 * 24 * 2
  },
  lastTwoWeeks: {
    suffix: "W2",
    flag: 64,
    windowMs: 3600000 * 24 * 14
  },
  lastEightDays: {
    suffix: "D8",
    flag: 128,
    windowMs: 3600000 * 24 * 8
  },
  last180Days: {
    suffix: "M6",
    flag: 256,
    windowMs: MAX_TIME_WINDOW_MS
  }
};

const PREVIOUS_CONFIG: {
  [timespan: string]: {
    subtractLeft: CountValidTimespan;
    subtractRight: CountValidTimespan;
    allowNegativeValue: boolean;
  };
} = {
  // These counters extract what should always be a larger value from a
  // smaller one. If they are negative than the value should be ignored
  // (i.e. in the case of not enough data.)
  previousLastDay: {
    subtractLeft: "lastTwoDays",
    subtractRight: "lastDay",
    allowNegativeValue: false
  },
  previousLastWeek: {
    subtractLeft: "lastTwoWeeks",
    subtractRight: "lastWeek",
    allowNegativeValue: false
  },
  // dayWeekAgo is internal only
  dayWeekAgo: {
    subtractLeft: "lastEightDays",
    subtractRight: "lastWeek",
    allowNegativeValue: false
  },

  // These x-over-y counters can be negative, but should still be null in
  // the initial missing data cases.
  dayOverDay: {
    subtractLeft: "lastDay",
    subtractRight: "previousLastDay",
    allowNegativeValue: true
  },
  dayOverWeek: {
    subtractLeft: "lastDay",
    subtractRight: "dayWeekAgo",
    allowNegativeValue: true
  },
  weekOverWeek: {
    subtractLeft: "lastWeek",
    subtractRight: "previousLastWeek",
    allowNegativeValue: true
  }
};

const TRENDING_CONFIG: {
  [timespan: string]: {
    current: CountValidTimespan;
    currentAndPrevious: CountValidTimespan;
  };
} = {
  dayOverDay: {
    current: "lastDay",
    currentAndPrevious: "lastTwoDays"
  },
  dayOverFullWeek: {
    current: "lastDay",
    currentAndPrevious: "lastWeek"
  },
  weekOverWeek: {
    current: "lastWeek",
    currentAndPrevious: "lastTwoWeeks"
  }
};

export interface CountCallAst extends CallAst {
  args: [CountArgsAst, Ast];
}

export interface CountServiceBumpProps {
  at: number;
  keys: SqrlKey[];
  by: number;
  flags: number;
}
export interface CountService {
  fetch(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    suffix: string
  ): Promise<number[]>;
  bump(manipulator: Manipulator, props: CountServiceBumpProps): void;
}

function interpretCountArgs(state: SqrlParserState, ast: CallAst) {
  const {
    args,
    whereAst,
    whereFeatures,
    whereTruth
  } = state.interpretCounterCallAst(ast);
  if (args.type !== "countArgs") {
    throw buildSqrlError(ast, "Function requires keyword arguments");
  }

  const counterProps: {
    features: string[];
    whereFeatures?: string[];
    whereTruth?: string;
    sumFeature?: string;
  } = {
    features: args.features.map((feature: AliasFeatureAst) => feature.alias),
    whereFeatures,
    whereTruth
  };

  // Include sumFeature in the key if provided - otherwise we will
  // just bump by 1 so leave it out of key.
  let bumpByAst: Ast = SqrlAst.constant(1);
  if (args.sumFeature) {
    counterProps.sumFeature = args.sumFeature.value;
    bumpByAst = SqrlAst.call("getBumpBy", [args.sumFeature]);
  }

  const { nodeAst, nodeId } = state.counterNode(ast, NODE_TYPE, counterProps);

  const featuresAst = SqrlAst.features(...args.features);
  const featureString = featuresAst.map(ast => ast.value).join("~");
  const keyedCounterName = `${nodeId.getIdString()}~${featureString}`;
  const keysAst = state.newGlobal(
    ast,
    SqrlAst.call("_getKeyList", [nodeAst, ...featuresAst]),
    `key(${keyedCounterName})`
  );
  const hasAlias = args.features.some(
    (featureAst: AliasFeatureAst) => featureAst.value !== featureAst.alias
  );

  return {
    args,
    bumpByAst,
    hasAlias,
    keyedCounterName,
    keysAst,
    nodeAst,
    nodeId,
    whereAst,
    whereFeatures,
    whereTruth
  };
}

export function ensureCounterBump(state: SqrlParserState, ast: CountCallAst) {
  const interpretResult = interpretCountArgs(state, ast);
  const {
    args,
    hasAlias,
    whereAst,
    keyedCounterName,
    bumpByAst,
    keysAst
  } = interpretResult;
  const timespanConfig = getTimespanConfig(args.timespan);

  // Only base the counter identity on features/where

  if (!hasAlias) {
    // Cache the bump flags on the function cache
    const flagsSlot = state.ensureConstantSlot(
      ast,
      `flags(${keyedCounterName}`,
      0
    );
    // tslint:disable-next-line:no-bitwise
    flagsSlot.setValue(flagsSlot.getValue() | timespanConfig.flag);

    state.addStatement(
      ast,
      "SqrlCountStatements",
      SqrlAst.registerCall(
        SqrlAst.call("_bumpCount", [
          SqrlAst.branchOrNull(whereAst, keysAst),
          bumpByAst,
          SqrlAst.slot(flagsSlot)
        ])
      ),
      `bump(${keyedCounterName})`
    );
  }
  return interpretResult;
}

export function registerCountFunctions(
  registry: FunctionRegistry,
  service: CountService
) {
  registry.save(
    function getBumpBy(bumpBy: number) {
      if (typeof bumpBy !== "number") {
        return null;
      }
      return bumpBy > 0 ? bumpBy : null;
    },
    {
      name: "getBumpBy",
      args: [AT.feature]
    }
  );

  registry.save(
    function _bumpCount(state, keys, by, flags) {
      if (!Array.isArray(keys)) {
        // This should never happen but has been seen in production
        state.fatal(
          {},
          "Keys passed to _bumpCount was not an array:: %j",
          keys
        );
      }

      service.bump(state.manipulator, {
        at: state.getClock(),
        keys,
        by,
        flags
      });
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any, AT.any],
      statement: true,
      statementFeature: "SqrlCountStatements"
    }
  );

  registry.save(
    function _fetchCountsFromDb(state: SqrlExecutionState, keys, suffix) {
      return service.fetch(state.ctx, state.getClock(), keys, suffix);
    },
    {
      name: "_fetchCountsFromDb",
      allowSqrlObjects: true,
      async: true,
      args: [AT.state, AT.any, AT.any]
    }
  );

  function replaceTimespan(ast, timespan) {
    invariant(
      ast.type === "call" &&
        ast.args.length > 0 &&
        ast.args[0].type === "countArgs",
      "Expected a count() ast to replace timespan in"
    );
    // Dive into the call ast and replace the timespan
    return Object.assign({}, ast, {
      args: [
        Object.assign({}, ast.args[0], {
          timespan
        }),
        ...ast.args.slice(1)
      ]
    });
  }

  registry.save(
    bluebird.method(async function fetchTrendingDetails(
      state,
      keys,
      currentCounts,
      currentAndPreviousCounts,
      minEvents
    ) {
      if (!currentCounts || !currentAndPreviousCounts) {
        return [];
      }
      invariant(
        currentCounts.length === currentAndPreviousCounts.length &&
          currentCounts.length === keys.length,
        "Mismatched current/previous trending counts."
      );

      const rv = [];
      currentCounts.forEach((currentCount, i) => {
        const currentAndPreviousCount = currentAndPreviousCounts[i];
        if (
          currentCount === null ||
          currentCount < minEvents ||
          currentAndPreviousCount === null ||
          currentAndPreviousCount < currentCount
        ) {
          return;
        }

        const key = keys[i];
        invariant(key !== null, "Received null key for current count.");

        const previousCount = currentAndPreviousCount - currentCount;
        const magnitude = Math.log10(currentCount / Math.max(previousCount, 1));
        if (magnitude >= 1) {
          rv.push({
            key: key.featureValues,
            current: currentCount,
            previous: previousCount,
            delta: 2 * currentCount - currentAndPreviousCount,
            magnitude
          });
        }
      });
      return rv;
    }),
    {
      async: true,
      args: [AT.state, AT.any, AT.any, AT.any, AT.any],
      allowSqrlObjects: true,
      name: "fetchTrendingDetails"
    }
  );

  registry.save(null, {
    name: "trending",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const { args } = state.interpretCounterCallAst(ast);
      if (args.type !== "trendingArgs") {
        throw buildSqrlError(ast, "Expected count() arguments");
      }

      sqrlInvariant(
        ast,
        args.timespan === "dayOverDay" ||
          args.timespan === "weekOverWeek" ||
          args.timespan === "dayOverFullWeek",
        "Invalid timespan for trending. Expecting `DAY OVER DAY` or `WEEK OVER WEEK` or `DAY OVER FULL WEEK`"
      );

      const timespanConfig = TRENDING_CONFIG[args.timespan];
      const currentCountAst = SqrlAst.call("_fetchCounts", [
        {
          type: "countArgs",
          features: args.features,
          sumFeature: null,
          timespan: timespanConfig.current
        },
        ast.args[1]
      ]);

      const currentAndPreviousCountAst = replaceTimespan(
        currentCountAst,
        timespanConfig.currentAndPrevious
      );

      const { keysAst } = interpretCountArgs(state, currentCountAst);

      return SqrlAst.call("fetchTrendingDetails", [
        keysAst,
        currentCountAst,
        currentAndPreviousCountAst,
        SqrlAst.constant(args.minEvents)
      ]);
    }
  });

  registry.save(null, {
    name: "_fetchCounts",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const { keysAst, args } = ensureCounterBump(state, ast as CountCallAst);
      const timespanConfig = getTimespanConfig(args.timespan);
      return SqrlAst.call("_fetchCountsFromDb", [
        keysAst,
        SqrlAst.constant(timespanConfig.suffix)
      ]);
    }
  });

  registry.save(null, {
    name: "count",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const { args, hasAlias, keyedCounterName, whereAst } = interpretCountArgs(
        state,
        ast
      );

      // Rewrite this count as a subtraction between other counts (whoah)
      if (PREVIOUS_CONFIG.hasOwnProperty(args.timespan)) {
        const previousConfig = PREVIOUS_CONFIG[args.timespan];

        // Convert into a subtract(left, right)
        // We transform into calls to count() which in turn will get transformed
        // themselves. This is necessary because the previous config might
        // itself be a recursive count.
        //
        // weekOverWeek = lastWeek - previousLastWeek
        //              = lastWeek - (lastTwoWeeks - lastWeek)
        //
        const resultAst = SqrlAst.call("subtract", [
          replaceTimespan(ast, previousConfig.subtractLeft),
          replaceTimespan(ast, previousConfig.subtractRight)
        ]);

        if (!previousConfig.allowNegativeValue) {
          const subtractionAst = state.newGlobal(
            ast,
            resultAst,
            `count(${args.timespan}:${keyedCounterName})`
          );
          return SqrlAst.branch(
            // if result < 0
            SqrlAst.call("cmpL", [subtractionAst, SqrlAst.constant(0)]),
            // then null
            SqrlAst.constant(null),
            // else result
            subtractionAst
          );
        }

        return resultAst;
      }

      const addAst = SqrlAst.branch(
        SqrlAst.and(whereAst, SqrlAst.feature("SqrlIsClassify")),
        SqrlAst.constant(1),
        SqrlAst.constant(0)
      );
      const resultAst = SqrlAst.call("add", [
        hasAlias ? SqrlAst.constant(0) : addAst,
        SqrlAst.call("arrayMax", [
          SqrlAst.call("_fetchCounts", ast.args),
          SqrlAst.constant(0)
        ])
      ]);
      return state.newGlobal(
        ast,
        resultAst,
        `count(${args.timespan}:${keyedCounterName})`
      );
    }
  });
}

export function getTimespanConfig(timespan) {
  invariant(
    TIMESPAN_CONFIG.hasOwnProperty(timespan),
    "Could not find suffix for timespan:: %j",
    timespan
  );
  return TIMESPAN_CONFIG[timespan];
}
