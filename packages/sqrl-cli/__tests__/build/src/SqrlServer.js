"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleManipulator_1 = require("sqrl/lib/simple/SimpleManipulator");
const micro = require("micro");
const microQuery = require("micro-query");
const dispatch = require("micro-route/dispatch");
function userInvariant(cond, message) {
    if (!cond) {
        throw micro.createError(400, message);
    }
}
async function run(ctx, labeler, req, res) {
    const query = microQuery(req);
    const featureTimeoutMs = parseInt(query.timeoutMs || "1000", 10);
    userInvariant(!isNaN(featureTimeoutMs), "timeoutMs was not a valid integer");
    const inputs = await micro.json(req, { limit: "128mb" });
    const manipulator = new SimpleManipulator_1.SimpleManipulator();
    const execution = await labeler.startExecution(ctx, {
        manipulator,
        inputs,
        featureTimeoutMs
    });
    await execution.fetchBasicByName("SqrlExecutionComplete");
    const rules = {};
    function ruleToName(rule) {
        rules[rule.name] = {
            reason: rule.reason
        };
        return rule.name;
    }
    const rv = {
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
            rv.features = {};
            await Promise.all(featureNames.map(async (featureName) => {
                rv.features[featureName] = await execution.fetchBasicByName(featureName);
            }));
        }
        catch (e) {
            throw micro.createError(500, e.message, e);
        }
    }
    await manipulator.mutate(ctx);
    res.setHeader("Content-Type", "application/json");
    if (query.hasOwnProperty("pretty")) {
        return JSON.stringify(rv, undefined, 2) + "\n";
    }
    else {
        return JSON.stringify(rv);
    }
}
async function deleteRoute(ctx, req, res) {
    throw micro.createError(500, "Not implemented\n");
}
function createSqrlServer(ctx, labeler) {
    const router = dispatch()
        .dispatch("/run", ["POST"], (req, res) => run(ctx, labeler, req, res))
        .dispatch("/delete", ["POST"], (req, res) => deleteRoute(ctx, req, res))
        .otherwise(async (req, res) => {
        throw micro.createError(404, "Route not found\n");
    });
    return micro(router);
}
exports.createSqrlServer = createSqrlServer;
