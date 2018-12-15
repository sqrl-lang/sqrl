/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { default as AT } from "../../src/ast/AstTypes";
import { SqrlFunctionRegistry } from "../../src/function/FunctionRegistry";
import { registerAllFunctions } from "../../src/function/registerAllFunctions";
import { SqrlTest } from "../../src/testing/SqrlTest";
import { JestAssertService } from "sqrl-test-utils";
import {
  runSqrlTest,
  buildTestFunctionRegistry
} from "../../src/testing/runSqrlTest";
import { createSimpleContext } from "../../src";

test("rules work", async () => {
  const functionRegistry = new SqrlFunctionRegistry();
  registerAllFunctions(functionRegistry, { assert: new JestAssertService() });
  const test = new SqrlTest(functionRegistry, {});

  await test.run(
    createSimpleContext(),
    `
  LET X := 5 + 1;
  CREATE RULE MyRule WHERE X;
  
  ASSERT MyRule = true;
  `
  );
});

test("when context works", async () => {
  const functionRegistry = await buildTestFunctionRegistry();

  let saveCount = 0;
  let savedContext = null;
  functionRegistry._wrapped.save(
    function saveContext(state, whenContext, word) {
      saveCount += 1;
      savedContext = {
        whenContext,
        word
      };
    },
    {
      statement: true,
      statementFeature: "SqrlSaveFunctions",
      args: [AT.state, AT.whenContext, AT.any],
      allowNull: true
    }
  );

  await runSqrlTest(
    `
  
  LET Five := 5;

  # RuleOne and RuleThree should fire
  CREATE RULE RuleOne WHERE Five > 1;
  CREATE RULE RuleTwo WHERE Five > 9;
  CREATE RULE RuleThree WHERE Five > 3 WITH REASON "\${Five}";

  WHEN RuleOne, RuleTwo, RuleThree THEN saveContext("bloop");
  WHEN RuleTwo THEN saveContext("should not fire");
  EXECUTE;
  `,
    { functionRegistry }
  );

  // We expect saveContext to only fire once
  expect(saveCount).toEqual(1);
  expect(savedContext).toEqual({
    whenContext: {
      firedRules: [
        { name: "RuleOne", reason: "" },
        { name: "RuleThree", reason: "5" }
      ]
    },
    word: "bloop"
  });

  // Try fire it manually (without whenContext)
  await runSqrlTest('saveContext("manual!"); EXECUTE;', { functionRegistry });
  expect(saveCount).toEqual(2);
  expect(savedContext).toEqual({
    whenContext: null,
    word: "manual!"
  });
});
