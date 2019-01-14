/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { buildTestFunctionRegistry } from "../../src/testing/runSqrlTest";
import { jsonTemplate } from "../../src/jslib/jsonTemplate";
import { registerTestFunctions } from "../helpers/TestFunctions";
import { runSqrlTest } from "../../src/simple/runSqrlTest";

test("saves features", async () => {
  const functionRegistry = await buildTestFunctionRegistry();
  registerTestFunctions(functionRegistry._wrapped);
  const librarySqrl = `
  LET SqrlOutput := getSqrlOutput(SqrlExecutionComplete);
  LET SqrlKafka := jsonValue(SqrlOutput, '$.kafka');
  `;

  await runSqrlTest(
    jsonTemplate`
    LET SampleFeature := 5;
    LET HiPete := {
      "hello": "Pete!",
    };

    saveFeatures("mytable", {
      SampleFeature,
      HiPete,
    });

    ASSERT jsonPath(SqrlKafka, '$.saveFeatures[0]') = ${[
      {
        tableName: "mytable",
        features: {
          SampleFeature: 5,
          HiPete: { hello: "Pete!" }
        }
      }
    ]};
  `,
    {
      librarySqrl,
      functionRegistry
    }
  );
});
