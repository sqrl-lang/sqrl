/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SimpleManipulator } from "./SimpleManipulator";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import * as bluebird from "bluebird";
import * as micro from "micro";
import * as microQuery from "micro-query";
import { dispatch } from "micro-route";
import * as zipObject from "lodash.zipobject";
import { FeatureMap } from "../feature/FeatureTypes";
import { IncomingMessage, ServerResponse } from "http";
import SqrlExecutable from "../execute/SqrlExecutable";
import { FiredRule } from "../function/WhenFunctions";
import { Context } from "../api/ctx";

function userInvariant(cond, message) {
  if (!cond) {
    throw micro.createError(400, message);
  }
}

interface ApiRulesResponse {
  [ruleName: string]: {
    reason: string;
  };
}

interface ApiResponse {
  /** Overall block/allow verdict for the action */
  allow: boolean;

  /** Details about why the verdict was reached */
  verdict: {
    blockRules: string[];
    whitelistRules: string[];
  };

  rules: ApiRulesResponse;

  /** Returns features requested via the API */
  features?: FeatureMap;
}

async function run(
  ctx: Context,
  labeler: SqrlExecutable,
  req: IncomingMessage,
  res: ServerResponse
) {
  const query = microQuery(req);
  const featureTimeoutMs = parseInt(query.timeoutMs || "1000", 10);
  userInvariant(!isNaN(featureTimeoutMs), "timeoutMs was not a valid integer");

  const inputs = await micro.json(req, { limit: "128mb" });

  const manipulator = new SimpleManipulator();
  const execution: SqrlExecutionState = await labeler.startExecution(ctx, {
    manipulator,
    inputs,
    featureTimeoutMs
  });

  await execution.fetchBasicByName("SqrlExecutionComplete");

  const rules: ApiRulesResponse = {};
  function ruleToName(rule: FiredRule) {
    rules[rule.name] = {
      reason: rule.reason
    };
    return rule.name;
  }

  const rv: ApiResponse = {
    allow: !manipulator.wasBlocked(),
    verdict: {
      blockRules: manipulator.blockedRules.map(ruleToName) || [],
      whitelistRules: manipulator.whitelistedRules.map(ruleToName) || []
    },
    rules
  };

  if (query.features) {
    const featureNames = query.features.split(",");
    try {
      const values = await bluebird.map(featureNames, featureName =>
        execution.fetchBasicByName(featureName)
      );
      rv.features = zipObject(featureNames, values);
    } catch (e) {
      throw micro.createError(500, e.message, e);
    }
  }

  await manipulator.mutate(ctx);

  res.setHeader("Content-Type", "application/json");

  if (query.hasOwnProperty("pretty")) {
    return JSON.stringify(rv, undefined, 2) + "\n";
  } else {
    return JSON.stringify(rv);
  }
}

async function deleteRoute(
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse
) {
  // @TODO: Delete node
  throw micro.createError(500, "Not implemented\n");
}

export function createSqrlServer(ctx, labeler) {
  const router = dispatch()
    .dispatch("/run", ["POST"], (req, res) => run(ctx, labeler, req, res))
    .dispatch("/delete", ["POST"], (req, res) => deleteRoute(ctx, req, res))
    .otherwise(async (req, res) => {
      throw micro.createError(404, "Route not found\n");
    });

  return micro(router);
}
