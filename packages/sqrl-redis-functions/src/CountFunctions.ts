/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)
import {
  AT,
  AstBuilder,
  SqrlKey,
  CompileState,
  Context,
  Execution,
  FunctionRegistry,
  sqrlInvariant,
  CountValidTimespan,
  Ast,
  Manipulator,
  CustomCallAst
} from "sqrl";

import { parse } from "./parser/sqrlRedisParser";

import { MAX_TIME_WINDOW_MS } from "./services/BucketedKeys";
import { invariant } from "sqrl-common";
import {
  CountArguments,
  TrendingArguments,
  AliasedFeature
} from "./parser/sqrlRedis";

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

function interpretCountArgs(
  state: CompileState,
  sourceAst: Ast,
  args: CountArguments
) {
  const { whereAst, whereFeatures, whereTruth } = state.combineGlobalWhere(
    args.where
  );

  const counterProps: {
    features: string[];
    whereFeatures?: string[];
    whereTruth?: string;
    sumFeature?: string;
  } = {
    features: args.features.map((feature: AliasedFeature) => feature.alias),
    whereFeatures,
    whereTruth
  };

  // Include sumFeature in the key if provided - otherwise we will
  // just bump by 1 so leave it out of key.
  let bumpByAst: Ast = AstBuilder.constant(1);
  if (args.sumFeature) {
    counterProps.sumFeature = args.sumFeature.value;
    bumpByAst = AstBuilder.call("getBumpBy", [args.sumFeature]);
  }

  const { nodeAst, nodeId } = state.addHashedNode(
    sourceAst,
    NODE_TYPE,
    counterProps
  );

  const featuresAst = args.features.map(aliasFeature =>
    AstBuilder.feature(aliasFeature.feature.value)
  );
  const featureString = featuresAst.map(ast => ast.value).join("~");
  const keyedCounterName = `${nodeId.getIdString()}~${featureString}`;
  const keysAst = state.setGlobal(
    sourceAst,
    AstBuilder.call("_getKeyList", [nodeAst, ...featuresAst]),
    `key(${keyedCounterName})`
  );
  const hasAlias = args.features.some(
    (featureAst: AliasedFeature) =>
      featureAst.feature.value !== featureAst.alias
  );

  return {
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

export function ensureCounterBump(
  state: CompileState,
  sourceAst: Ast,
  args: CountArguments
) {
  const interpretResult = interpretCountArgs(state, sourceAst, args);

  const {
    hasAlias,
    whereAst,
    keyedCounterName,
    bumpByAst,
    keysAst
  } = interpretResult;

  // Only base the counter identity on features/where
  if (hasAlias) {
    return interpretResult;
  }

  const timespanConfig = getTimespanConfig(args.timespan);

  // Cache the bump flags on the function cache
  const flagsSlot = state.setConstantSlot(
    sourceAst,
    `flags(${keyedCounterName}`,
    0
  );
  // tslint:disable-next-line:no-bitwise
  flagsSlot.setValue(flagsSlot.getValue() | timespanConfig.flag);

  const slotAst = state.setGlobal(
    sourceAst,
    AstBuilder.call("_bumpCount", [
      AstBuilder.branch(whereAst, keysAst, AstBuilder.constant(null)),
      bumpByAst,
      AstBuilder.slot(flagsSlot)
    ]),
    `bump(${keyedCounterName})`
  );
  state.addStatement("SqrlCountStatements", slotAst);

  return interpretResult;
}

export function registerCountFunctions(
  registry: FunctionRegistry,
  service: CountService
) {
  registry.registerSync(
    function getBumpBy(bumpBy: number) {
      if (typeof bumpBy !== "number") {
        return null;
      }
      return bumpBy > 0 ? bumpBy : null;
    },
    {
      args: [AT.feature]
    }
  );

  registry.registerStatement(
    "SqrlCountStatements",
    async function _bumpCount(state, keys, by, flags) {
      if (!Array.isArray(keys)) {
        // This should never happen but has been seen in production
        state.fatal(
          {},
          "Keys passed to _bumpCount was not an array:: %j",
          keys
        );
      }

      service.bump(state.manipulator, {
        at: state.getClockMs(),
        keys,
        by,
        flags
      });
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any, AT.any]
    }
  );

  registry.register(
    function _fetchCountsFromDb(state: Execution, keys, suffix) {
      return service.fetch(state.ctx, state.getClockMs(), keys, suffix);
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any]
    }
  );

  registry.register(
    async function fetchTrendingDetails(
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
    },
    {
      args: [AT.state, AT.any, AT.any, AT.any, AT.any],
      allowSqrlObjects: true
    }
  );

  registry.registerCustom(function trending(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const args: TrendingArguments = parse(ast.source, {
      startRule: "TrendingArguments"
    });

    sqrlInvariant(
      ast,
      args.timespan === "dayOverDay" ||
        args.timespan === "weekOverWeek" ||
        args.timespan === "dayOverFullWeek",
      "Invalid timespan for trending. Expecting `DAY OVER DAY` or `WEEK OVER WEEK` or `DAY OVER FULL WEEK`"
    );

    const timespanConfig = TRENDING_CONFIG[args.timespan];
    const currentCountArgs: CountArguments = {
      features: args.features,
      sumFeature: null,
      timespan: timespanConfig.current,
      where: args.where
    };

    const currentCountAst = databaseCountTransform(
      state,
      ast,
      currentCountArgs
    );

    const currentAndPreviousCountAst = databaseCountTransform(state, ast, {
      ...currentCountArgs,
      timespan: timespanConfig.currentAndPrevious
    });

    const { keysAst } = interpretCountArgs(state, ast, currentCountArgs);

    return AstBuilder.call("fetchTrendingDetails", [
      keysAst,
      currentCountAst,
      currentAndPreviousCountAst,
      AstBuilder.constant(args.minEvents)
    ]);
  });

  function databaseCountTransform(
    state: CompileState,
    sourceAst: Ast,
    args: CountArguments
  ): Ast {
    const { keysAst } = ensureCounterBump(state, sourceAst, args);
    const timespanConfig = getTimespanConfig(args.timespan);
    return AstBuilder.call("_fetchCountsFromDb", [
      keysAst,
      AstBuilder.constant(timespanConfig.suffix)
    ]);
  }

  function classifyCountTransform(
    state: CompileState,
    ast: CustomCallAst,
    args: CountArguments
  ) {
    const { hasAlias, keyedCounterName, whereAst } = interpretCountArgs(
      state,
      ast,
      args
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
      const resultAst = AstBuilder.call("subtract", [
        classifyCountTransform(state, ast, {
          ...args,
          timespan: previousConfig.subtractLeft
        }),
        classifyCountTransform(state, ast, {
          ...args,
          timespan: previousConfig.subtractRight
        })
      ]);

      if (!previousConfig.allowNegativeValue) {
        const subtractionAst = state.setGlobal(
          ast,
          resultAst,
          `count(${args.timespan}:${keyedCounterName})`
        );
        return AstBuilder.branch(
          // if result < 0
          AstBuilder.call("cmpL", [subtractionAst, AstBuilder.constant(0)]),
          // then null
          AstBuilder.constant(null),
          // else result
          subtractionAst
        );
      }

      return resultAst;
    }

    const addAst = AstBuilder.branch(
      AstBuilder.and([whereAst, AstBuilder.feature("SqrlIsClassify")]),
      AstBuilder.constant(1),
      AstBuilder.constant(0)
    );
    const resultAst = AstBuilder.call("add", [
      hasAlias ? AstBuilder.constant(0) : addAst,
      AstBuilder.call("arrayMax", [
        databaseCountTransform(state, ast, args),
        AstBuilder.constant(0)
      ])
    ]);
    return state.setGlobal(
      ast,
      resultAst,
      `count(${args.timespan}:${keyedCounterName})`
    );
  }
  registry.registerCustom(function count(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
    const args: CountArguments = parse(ast.source, {
      startRule: "CountArguments"
    });
    return classifyCountTransform(state, ast, args);
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
