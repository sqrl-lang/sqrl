/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { buildTestInstance } from "../../src/testing/runSqrlTest";
import { FunctionCostData } from "../../src/function/Instance";
import { registerTestFunctions } from "../helpers/TestFunctions";
import { Instance } from "../../src/api/execute";
import { runSqrlTest } from "../../src/simple/runSqrlTest";

test("works", async () => {
  let instance: Instance;
  const messages = [];
  let output;

  async function recreateInstance(functionCost?: FunctionCostData) {
    instance = await buildTestInstance({ functionCost });

    registerTestFunctions(instance._instance);
    instance._instance.save(function simpleFalse() {
      return false;
    });
    instance._instance.save(function logIfRun(msg: string) {
      messages.push(msg);
      return msg;
    });
    instance._instance.save(
      function outputSave(value: any) {
        output = value;
      },
      {
        statement: true,
        statementFeature: "SqrlOutputStatements"
      }
    );
  }
  await recreateInstance();

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
    { instance, librarySqrl }
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
      instance,
      librarySqrl
    }
  );

  // Nothing was logged, and no new messages
  expect(messages.splice(0)).toEqual([]);

  // Use the same code as before, but now with simpleFalse being expensive
  await recreateInstance({
    simpleFalse: 100
  });

  await runSqrlTest(
    `
    LET ExpensiveFeature := delayMs(0, logIfRun("Expensive :("));
    LET SimpleFalseFeature := simpleFalse();

    if(SimpleFalseFeature, outputSave(logIfRun("if fired")));
    ASSERT (SimpleFalseFeature AND ExpensiveFeature) = false;
        `,
    { instance, librarySqrl }
  );

  // This time round the expensive feature was loaded
  expect(messages.splice(0)).toEqual(["Expensive :("]);
});
