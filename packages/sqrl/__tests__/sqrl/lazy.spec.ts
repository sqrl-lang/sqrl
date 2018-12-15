/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  runSqrlTest,
  buildTestFunctionRegistry
} from "../../src/testing/runSqrlTest";
import { FunctionCostData } from "../../src/function/FunctionRegistry";
import { registerTestFunctions } from "../helpers/TestFunctions";
import { FunctionRegistry } from "../../src/api/execute";

test("works", async () => {
  let functionRegistry: FunctionRegistry;
  const messages = [];
  let output;

  async function rebuildFunctionRegistry(functionCost?: FunctionCostData) {
    functionRegistry = await buildTestFunctionRegistry({ functionCost });

    registerTestFunctions(functionRegistry._wrapped);
    functionRegistry._wrapped.save(function simpleFalse() {
      return false;
    });
    functionRegistry._wrapped.save(function logIfRun(msg: string) {
      messages.push(msg);
      return msg;
    });
    functionRegistry._wrapped.save(
      function outputSave(value: any) {
        output = value;
      },
      {
        statement: true,
        statementFeature: "SqrlOutputStatements"
      }
    );
  }
  await rebuildFunctionRegistry();

  const librarySqrl = `
  LET SqrlOutput := getSqrlOutput(SqrlExecutionComplete);
  LET SqrlKafka := jsonValue(SqrlOutput, '$.kafka');
  `;
  // First make sure _loggedErrorIfRun() actually works
  await runSqrlTest(
    `
LET DelayedYes := delayMs(10, true);
LET ErrorFeature := delayMs(20, logIfRun("Bang!"));
if(DelayedYes, outputSave(ErrorFeature));
EXECUTE;
  `,
    { functionRegistry, librarySqrl }
  );

  expect(messages.splice(0)).toEqual(["Bang!"]);
  expect(output).toEqual("Bang!");

  await runSqrlTest(
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
      functionRegistry,
      librarySqrl
    }
  );

  // Nothing was logged, and no new messages
  expect(messages.splice(0)).toEqual([]);

  // Use the same code as before, but now with simpleFalse being expensive
  await rebuildFunctionRegistry({
    simpleFalse: 100
  });

  await runSqrlTest(
    `
    LET ExpensiveFeature := delayMs(0, logIfRun("Expensive :("));
    LET SimpleFalseFeature := simpleFalse();

    if(SimpleFalseFeature, outputSave(logIfRun("if fired")));
    ASSERT (SimpleFalseFeature AND ExpensiveFeature) = false;
        `,
    { functionRegistry, librarySqrl }
  );

  // This time round the expensive feature was loaded
  expect(messages.splice(0)).toEqual(["Expensive :("]);
});
