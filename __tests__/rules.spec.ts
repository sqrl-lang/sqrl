/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { default as AT } from "../src/ast/AstTypes";
import FunctionRegistry from "../src/function/FunctionRegistry";
import { registerAllFunctions } from "../src/function/registerAllFunctions";
import { SqrlTest } from "../src/testing/SqrlTest";
import { JestAssertService } from "./helpers/JestAssert";
import {
  buildTestTrace,
  runSqrl,
  buildFunctionRegistry
} from "./helpers/sqrlTest";

test("rules work", async () => {
  const functionRegistry = new FunctionRegistry();
  registerAllFunctions(functionRegistry, { assert: new JestAssertService() });
  const test = new SqrlTest(functionRegistry, {});

  await test.run(
    buildTestTrace(),
    `
  LET X := 5 + 1;
  CREATE RULE MyRule WHERE X;
  
  ASSERT MyRule = true;
  `
  );
});

test("when context works", async () => {
  const functionRegistry = buildFunctionRegistry();

  let saveCount = 0;
  let savedContext = null;
  functionRegistry.save(
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

  await runSqrl(
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
  await runSqrl('saveContext("manual!"); EXECUTE;', { functionRegistry });
  expect(saveCount).toEqual(2);
  expect(savedContext).toEqual({
    whenContext: null,
    word: "manual!"
  });
});
