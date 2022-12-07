/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import micro, { createError, send, json as microJson } from "micro";
import * as microQuery from "micro-query";
// tslint:disable-next-line:no-submodule-imports (it is the documented suggestion)
import * as dispatch from "micro-route/dispatch";
import { IncomingMessage, ServerResponse, Server } from "http";
import { Context, FeatureMap, Executable, Execution, FiredRule } from "sqrl";
import { CliManipulator } from "sqrl-cli-functions";
import { invariant } from "sqrl-common";

function userInvariant(cond, message) {
  if (!cond) {
    throw createError(400, message);
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
  executable: Executable,
  req: IncomingMessage,
  res: ServerResponse
) {
  const query = microQuery(req);
  const featureTimeoutMs = parseInt(query.timeoutMs || "1000", 10);
  userInvariant(!isNaN(featureTimeoutMs), "timeoutMs was not a valid integer");

  const inputs = await microJson(req, { limit: "128mb" });

  const manipulator = new CliManipulator();
  const execution: Execution = await executable.execute(ctx, {
    manipulator,
    inputs,
    featureTimeoutMs,
  });

  await execution.fetchFeature("SqrlExecutionComplete");

  const rules: ApiRulesResponse = {};
  function ruleToName(rule: FiredRule) {
    rules[rule.name] = {
      reason: rule.reason,
    };
    return rule.name;
  }

  const rv: ApiResponse = {
    allow: !manipulator.wasBlocked(),
    verdict: {
      blockRules: manipulator.blockedRules.map(ruleToName) || [],
      whitelistRules: manipulator.whitelistedRules.map(ruleToName) || [],
    },
    rules,
  };

  if (query.features) {
    const featureNames = query.features.split(",");
    try {
      rv.features = {};
      await Promise.all(
        featureNames.map(async (featureName) => {
          rv.features[featureName] = await execution.fetchValue(featureName);
        })
      );
    } catch (e) {
      invariant(e instanceof Error, "Expected error object");
      throw createError(500, e.message, e);
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
  // @TODO: Delete entity
  throw createError(500, "Not implemented\n");
}

export function createSqrlServer(ctx: Context, executable: Executable): Server {
  const router = dispatch()
    .dispatch('/health', '*', (req, res, { params, query }) => send(res, 200, "Hello"))
    .dispatch("/run", ["POST"], (req, res) => run(ctx, executable, req, res))
    .dispatch("/delete", ["POST"], (req, res) => deleteRoute(ctx, req, res))
    .otherwise(async (req, res) => {
      throw createError(404, "Route not found\n");
    });

  // The types included with the micro() package do not match the documentation/reality
  return micro(router) as unknown as Server;
}

export type ServerWaitCallback = (props: { server: Server }) => Promise<void>;
