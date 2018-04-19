/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrl } from "./helpers/sqrlTest";
import { jsonTemplate } from "../src/jslib/jsonTemplate";

test("saves features", async () => {
  await runSqrl(jsonTemplate`
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
  `);
});
