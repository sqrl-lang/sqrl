/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { range } from "sqrl-common";
import { runSqrl } from "./helpers/runSqrl";

test("multi aliases work", async () => {
  await runSqrl(
    `
    LET SqrlIsClassify := true;
    LET SessionActor := object("user", "josh");
    LET Target := object("user", "julian");
    LET ActionName := "report";

    LET NumTimesReported := count(BY SessionActor AS Target WHERE ActionName = "report" LAST WEEK);
    LET NumReportsForTarget := count(BY Target WHERE ActionName = "report" LAST WEEK);

    # See how many times Julian as the target has been reported
    ASSERT NumReportsForTarget = 1;
    # See how many times Josh as the target has been reported
    ASSERT NumTimesReported = 0;

    # Josh reports Julian 3 times
    EXECUTE;
    EXECUTE;
    EXECUTE;

    # Flip Actor and julian
    LET SessionActor := object("user", "julian");
    LET Target := object("user", "josh");

    # Now that Julian is reporting Josh they should both have one report

    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;

    EXECUTE;

    # Where condition being false means we don't bump but can still read out the values
    LET ActionName := "random";
    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;
  `
  );
  /*
  test.tagData.trackSqrlKeys.assert([
    'counter=c4e3d7fc;timeMs=2016-09-26T20:56:14.544Z;features=["user/josh"]',
    'counter=c4e3d7fc;timeMs=2016-09-26T20:56:14.544Z;features=["user/julian"]'
  ]);
  */
});

test("trending works ", async () => {
  for (const where of ["WHERE SomeCondition", ""]) {
    await runSqrl(`
LET SqrlIsClassify := true;
LET SomeCondition := true;

LET UserGeneratedTextTriGrams := [
  node("TriGrams", "a trending trigram"),
];

# One bump from standard count to show they use same keys
LET TrendingTriGramsDayOverDay := count(BY UserGeneratedTextTriGrams ${where} DAY OVER DAY);
EXECUTE;

LET TrendingTriGramsDayOverDay := trending(UserGeneratedTextTriGrams ${where} DAY OVER DAY );
# 0 -> 10 is enough to trigger a trending hit.
${range(9)
      .map(() => "EXECUTE;")
      .join("\n")}
ASSERT TrendingTriGramsDayOverDay = [
  {
    "key": [
      "a trending trigram"
    ],
    "current": 10,
    "delta": 10,
    "previous": 0,
    "magnitude": 1
  }
];

LET TrendingTriGramsDayOverDay := trending(
  UserGeneratedTextTriGrams ${where} WITH MIN EVENTS 11 DAY OVER DAY
);
ASSERT TrendingTriGramsDayOverDay = [];
`);
  }
  /*
    test.tagData.trackSqrlKeys.assert([
      `counter=${counterHash};timeMs=2016-09-26T20:56:14.${timeMs}Z;features=["a trending trigram"]`
    ]);
*/
});
