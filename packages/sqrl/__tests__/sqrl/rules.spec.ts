/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../../src/ast/AstTypes";
import { SqrlInstance } from "../../src/function/Instance";
import { registerAllFunctions } from "../../src/function/registerAllFunctions";
import { SqrlTest } from "../../src/testing/SqrlTest";
import { JestAssertService } from "sqrl-test-utils";
import { buildTestInstance } from "../../src/testing/runSqrlTest";
import { createSimpleContext } from "../../src";
import { runSqrlTest } from "../../src/simple/runSqrlTest";

test("rules work", async () => {
  const instance = new SqrlInstance();
  registerAllFunctions(instance, { assert: new JestAssertService() });
  const test = new SqrlTest(instance, {});

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
  const instance = await buildTestInstance();

  let saveCount = 0;
  let savedContext = null;
  instance._instance.save(
    function saveContext(state, whenCause, word) {
      saveCount += 1;
      savedContext = {
        whenCause,
        word
      };
    },
    {
      statement: true,
      statementFeature: "SqrlSaveFunctions",
      args: [AT.state, AT.whenCause, AT.any],
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
    { instance }
  );

  // We expect saveContext to only fire once
  expect(saveCount).toEqual(1);
  expect(savedContext).toEqual({
    whenCause: {
      firedRules: [
        { name: "RuleOne", reason: "" },
        { name: "RuleThree", reason: "5" }
      ]
    },
    word: "bloop"
  });

  // Try fire it manually (without whenCause)
  await runSqrlTest('saveContext("manual!"); EXECUTE;', {
    instance
  });
  expect(saveCount).toEqual(2);
  expect(savedContext).toEqual({
    whenCause: null,
    word: "manual!"
  });

  // Ensure multiple strings as reasons work
  await runSqrlTest(
    `
  LET Five := 5;
  CREATE RULE RuleX WHERE Five > 3 WITH REASON "Got your "
                                               "\${Five} "
                                               "here!";

  WHEN RuleX THEN saveContext("fire!");
  EXECUTE;
  `,
    { instance }
  );
  expect(saveCount).toEqual(3);
  expect(savedContext).toEqual({
    whenCause: {
      firedRules: [{ name: "RuleX", reason: "Got your 5 here!" }]
    },
    word: "fire!"
  });
});
