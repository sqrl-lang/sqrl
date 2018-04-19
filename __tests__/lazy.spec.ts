/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrl, buildFunctionRegistry } from "./helpers/sqrlTest";
import FunctionRegistry, {
  FunctionCostData
} from "../src/function/FunctionRegistry";

test("works", async () => {
  let functionRegistry: FunctionRegistry;
  const messages = [];
  let output;

  function rebuildFunctionRegistry(functionCost?: FunctionCostData) {
    functionRegistry = buildFunctionRegistry({ functionCost });

    functionRegistry.save(function simpleFalse() {
      return false;
    });
    functionRegistry.save(function logIfRun(msg: string) {
      messages.push(msg);
      return msg;
    });
    functionRegistry.save(
      function outputSave(value: any) {
        output = value;
      },
      {
        statement: true,
        statementFeature: "SqrlOutputStatements"
      }
    );
  }
  rebuildFunctionRegistry();

  // First make sure _loggedErrorIfRun() actually works
  await runSqrl(
    `
LET DelayedYes := delayMs(10, true);
LET ErrorFeature := delayMs(20, logIfRun("Bang!"));
if(DelayedYes, outputSave(ErrorFeature));
EXECUTE;
  `,
    { functionRegistry }
  );

  expect(messages.splice(0)).toEqual(["Bang!"]);
  expect(output).toEqual("Bang!");

  await runSqrl(
    `
# This line should be more expensive than simpleFalse()
LET ExpensiveFeature := delayMs(0, logIfRun("Expensive :("));
LET SimpleFalseFeature := simpleFalse();

# ErrorFeature should never be evalulated based on cost comparison
if(SimpleFalseFeature, outputSave(logIfRun("if fired")));
ASSERT (SimpleFalseFeature AND ExpensiveFeature) = false;
ASSERT (ExpensiveFeature AND SimpleFalseFeature) = false;
EXECUTE;
  `,
    {
      functionRegistry
    }
  );

  // Nothing was logged, and no new messages
  expect(messages.splice(0)).toEqual([]);

  // Use the same code as before, but now with simpleFalse being expensive
  rebuildFunctionRegistry({
    simpleFalse: 100
  });

  await runSqrl(
    `
    LET ExpensiveFeature := delayMs(0, logIfRun("Expensive :("));
    LET SimpleFalseFeature := simpleFalse();

    if(SimpleFalseFeature, outputSave(logIfRun("if fired")));
    ASSERT (SimpleFalseFeature AND ExpensiveFeature) = false;
        `,
    { functionRegistry }
  );

  // This time round the expensive feature was loaded
  expect(messages.splice(0)).toEqual(["Expensive :("]);
});
