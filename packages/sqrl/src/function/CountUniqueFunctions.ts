/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";

import bluebird = require("bluebird");
import SqrlAst from "../ast/SqrlAst";

import stringify = require("fast-stable-stringify");
import invariant from "../jslib/invariant";
import { CallAst, Ast, AliasFeatureAst } from "../ast/Ast";
import SqrlObject from "../object/SqrlObject";
import sqrlValueCartesianProduct from "../jslib/sqrlValueCartesianProduct";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { Manipulator } from "../platform/Manipulator";
import SqrlKey from "../object/SqrlKey";
import { buildSqrlError } from "../api/parse";
import { SqrlParserState } from "../compile/SqrlParserState";
import { murmurhashHexSync } from "../jslib/murmurhashJson";

import { MAX_TIME_WINDOW_MS } from "../services/BucketedKeys";
import { Context } from "../api/ctx";

// This hashes a value to match output from slidingd
function slidingdHashHex(value) {
  if (value instanceof SqrlObject) {
    value = value.getBasicValue();
  }
  if (typeof value !== "string" && !(value instanceof Buffer)) {
    value = stringify(value);
  }

  return murmurhashHexSync(value).substring(16);
}

function isCountable(features) {
  return features.every(v => {
    return v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
}

function sortByAlias(features: AliasFeatureAst[]): AliasFeatureAst[] {
  return Array.from(features).sort((left, right) => {
    return left.alias.localeCompare(right.alias);
  });
}

const tupleToString = tuple => stringify(tuple.map(SqrlObject.ensureBasic));

export interface CountUniqueService {
  bump(
    manipulator: Manipulator,
    props: {
      at: number;
      key: SqrlKey;
      sortedHashes: string[];
      expireAtMs: number;
    }
  ): void;
  fetchHashes(
    ctx: Context,
    props: { keys: SqrlKey[]; windowStartMs: number }
  ): Promise<string[]>;
  fetchCounts(
    ctx: Context,
    props: {
      keys: SqrlKey[];
      at: number;
      windowMs: number;
      addHashes: string[];
    }
  ): Promise<number[]>;
}

export function registerCountUniqueFunctions(
  registry: FunctionRegistry,
  service: CountUniqueService
) {
  registry.save(
    function _bumpCountUnique(state: SqrlExecutionState, keys, uniques) {
      uniques = SqrlObject.ensureBasic(uniques);
      if (!keys.length || !isCountable(uniques)) {
        return;
      }

      // @TODO Figure out a better way to batch up these adds
      for (const features of sqrlValueCartesianProduct(uniques)) {
        const isTuple = features.length > 1;
        const element = isTuple ? tupleToString(features) : features[0];
        const hashes = [slidingdHashHex(element)];

        for (const key of keys) {
          service.bump(state.manipulator, {
            at: state.getClock(),
            key,
            sortedHashes: hashes,
            expireAtMs: Date.now() + MAX_TIME_WINDOW_MS
          });
        }
      }
    },
    {
      allowSqrlObjects: true,
      stateArg: true,
      statement: true,
      statementFeature: "SqrlCountUniqueStatements"
    }
  );

  registry.save(
    function _unionCountUnique(left, right) {
      invariant(
        left instanceof Set && right instanceof Set,
        "expected left and right to be Sets"
      );
      let count = left.size;
      right.forEach(element => {
        if (!left.has(element)) {
          count++;
        }
      });
      return count;
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.save(
    function _intersectCountUnique(left, right) {
      invariant(
        left instanceof Set && right instanceof Set,
        "expected left and right to be Sets"
      );
      let count = 0;
      left.forEach(element => {
        if (right.has(element)) {
          count++;
        }
      });
      return count;
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.save(
    function _fetchCountUnique(state, keys, windowMs, uniques) {
      uniques = SqrlObject.ensureBasic(uniques).map(value => {
        if (typeof value === "number") {
          return "" + value;
        } else {
          return value;
        }
      });
      return fetchCount(
        state.ctx,
        service,
        keys,
        state.getClock(),
        windowMs,
        uniques
      );
    },
    {
      allowSqrlObjects: true,
      async: true,
      stateArg: true
    }
  );

  registry.save(
    async function _fetchCountUniqueElements(
      state,
      keys,
      windowStartMs,
      uniques
    ) {
      const hexElements = new Set();

      if (keys.length === 0) {
        return bluebird.resolve(hexElements);
      }

      // If uniques are empty or we are not bumping do not fetch count with current values.
      let elements = [];
      uniques = SqrlObject.ensureBasic(uniques);
      if (isCountable(uniques)) {
        const products = sqrlValueCartesianProduct(uniques);
        elements = products.map(features => {
          const isTuple = features.length > 1;
          return isTuple ? tupleToString(features) : features[0];
        });
      }

      elements.forEach(element => {
        hexElements.add(slidingdHashHex(element));
      });

      const hashes = await service.fetchHashes(state.ctx, {
        keys,
        windowStartMs
      });
      hashes.forEach(hash => {
        hexElements.add(hash);
      });
      return hexElements;
    },
    {
      allowSqrlObjects: true,
      async: true,
      stateArg: true
    }
  );

  registry.save(null, {
    name: "countUnique",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const {
        args,
        whereAst,
        whereFeatures,
        whereTruth
      } = state.interpretCounterCallAst(ast);
      if (args.type !== "countUniqueArgs") {
        throw buildSqrlError(ast, "countUnique() requires keyword arguments");
      }

      const sortedUniques: AliasFeatureAst[] = sortByAlias(args.uniques);
      const sortedGroup: AliasFeatureAst[] = sortByAlias(args.groups);

      const uniquesAst = SqrlAst.list(...SqrlAst.features(...sortedUniques));

      const groupAliases = args.groups.map(feature => feature.alias);
      const groupFeatures = args.groups.map(feature => feature.value);
      const groupHasAliases = args.groups.some(f => f.value !== f.alias);
      const sortedGroupAliases = sortedGroup.map(feature => feature.alias);

      const { nodeId, nodeAst } = state.counterNode(ast, "UniqueCounter", {
        whereFeatures,
        whereTruth,
        groups: sortedGroupAliases,
        uniques: sortedUniques.map(feature => feature.alias)
      });

      const originalKeysAst = state.newGlobal(
        ast,
        SqrlAst.call("_getKeyList", [
          nodeAst,
          ...SqrlAst.features(...groupAliases)
        ]),
        `key(${nodeId.getIdString()})`
      );

      // Always bump the counter according to the original keys (aliases)
      state.pushStatement(
        SqrlAst.call("_bumpCountUnique", [
          SqrlAst.branchOrNull(whereAst, originalKeysAst),
          uniquesAst
        ])
      );

      let keysAst = originalKeysAst;
      let countExtraUniques = SqrlAst.branch(
        whereAst,
        uniquesAst,
        SqrlAst.constant([])
      );

      if (groupHasAliases) {
        keysAst = state.newGlobal(
          ast,
          SqrlAst.call("_getKeyList", [
            nodeAst,
            ...SqrlAst.features(...groupFeatures)
          ]),
          `key(${nodeId.getIdString()}:${groupFeatures.join(",")})`
        );

        // If we're using aliases we only count the uniques in this request if
        // they exactly match the aliases that we used
        const aliasesEqualAst = SqrlAst.call("cmpE", [
          SqrlAst.list(...SqrlAst.features(...groupAliases)),
          SqrlAst.list(...SqrlAst.features(...groupFeatures))
        ]);
        countExtraUniques = SqrlAst.branch(
          aliasesEqualAst,
          countExtraUniques,
          SqrlAst.constant([])
        );
      }

      if (args.beforeAction) {
        countExtraUniques = SqrlAst.constant([]);
      }

      const originalCall = SqrlAst.call("_fetchCountUnique", [
        keysAst,
        SqrlAst.constant(args.windowMs || MAX_TIME_WINDOW_MS),
        countExtraUniques
      ]);

      if (args.setOperation) {
        invariant(
          args === ast.args[0] && args.type === "countUniqueArgs",
          "Expected countUniqueArgs for intersect transform"
        );

        const { operation, features } = args.setOperation;
        const rightCountArgs = Object.assign({}, args, {
          groups: features,
          setOperation: null
        });
        const rightCall = state.transform(
          Object.assign({}, ast, {
            args: [rightCountArgs, ...ast.args.slice(1)]
          })
        );

        let setFunction;
        if (operation === "intersect") {
          setFunction = "_intersectCountUnique";
        } else if (operation === "union") {
          setFunction = "_unionCountUnique";
        } else {
          throw new Error("Unknown set operation: " + operation);
        }

        return SqrlAst.call(setFunction, [
          Object.assign({}, originalCall, {
            func: "_fetchCountUniqueElements"
          }),
          Object.assign({}, rightCall, { func: "_fetchCountUniqueElements" })
        ]);
      }

      return originalCall;
    }
  });
}

async function fetchCount(
  ctx: Context,
  service: CountUniqueService,
  keys,
  clockMs,
  windowMs,
  uniques
) {
  if (keys.length === 0) {
    return bluebird.resolve(0);
  }

  // If uniques are empty or we are not bumping do not fetch count with current values.
  let elements = [];
  if (isCountable(uniques)) {
    const products = sqrlValueCartesianProduct(uniques);
    elements = products.map(features => {
      const isTuple = features.length > 1;
      return isTuple ? tupleToString(features) : features[0];
    });
  }

  elements = elements.map(slidingdHashHex);

  const results = await service.fetchCounts(ctx, {
    keys,
    at: clockMs,
    windowMs,
    addHashes: elements
  });
  return Math.round(Math.max(0, ...results));
}
