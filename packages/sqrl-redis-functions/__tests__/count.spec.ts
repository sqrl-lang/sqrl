/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { range, jsonTemplate } from "sqrl-common";
import { runSqrl } from "./helpers/runSqrl";

test("multi aliases work", async () => {
  const { lastManipulator } = await runSqrl(
    `
    LET SqrlIsClassify := true;
    LET SessionActor := node("User", "josh");
    LET Target := node("User", "julian");
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
    LET SessionActor := node("User", "julian");
    LET Target := node("User", "josh");

    # Now that Julian is reporting Josh they should both have one report

    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;

    EXECUTE;

    # Where condition being false means we don't bump but can still read out the values
    LET ActionName := "random";
    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;
  `,
    { startMs: 1547758287017 }
  );

  expect(Array.from(lastManipulator.sqrlKeys).sort()).toEqual([
    'counter=054c84dc;timeMs=2019-01-17T20:51:27.017Z;features=["josh"]',
    'counter=054c84dc;timeMs=2019-01-17T20:51:27.017Z;features=["julian"]'
  ]);
});

test("trending works ", async () => {
  const counterHash = {
    "WHERE SomeCondition": "741a4d97",
    "": "a7274005"
  };
  for (const where of ["WHERE SomeCondition", ""]) {
    const { lastManipulator } = await runSqrl(
      `
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
`,
      { startMs: 1547758287017 }
    );

    expect(Array.from(lastManipulator.sqrlKeys)).toEqual([
      `counter=${
        counterHash[where]
      };timeMs=2019-01-17T20:51:27.017Z;features=["a trending trigram"]`
    ]);
  }
});

test("decaying works", async () => {
  await runSqrl(jsonTemplate`
    LET StartClock := '2019-01-17T20:59:28.874Z';

    LET SqrlClock := StartClock;
    LET Actor := 'josh';

    LET CountDay := count(BY Actor LAST DAY);
    LET CountWeek := count(BY Actor LAST WEEK);
    LET CountMonth := count(BY Actor LAST MONTH);
    LET CountTotal := count(BY Actor TOTAL);

    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 1;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT1H");
    ASSERT CountDay = 2;
    ASSERT CountWeek = 2;
    ASSERT CountMonth = 2;
    ASSERT CountTotal = 2;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT30H");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 3;
    ASSERT CountMonth = 3;
    ASSERT CountTotal = 3;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P2D");
    ASSERT CountDay = 2;
    ASSERT CountWeek = 4;
    ASSERT CountMonth = 4;
    ASSERT CountTotal = 4;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P10D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 5;
    ASSERT CountTotal = 5;
    EXECUTE;
    
    LET SqrlClock := dateAdd(StartClock, "P30D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 5;
    ASSERT CountTotal = 6;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P35D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 2;
    ASSERT CountMonth = 3;
    ASSERT CountTotal = 7;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P90D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 8;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P4Y");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 9;
    EXECUTE;
  `);
});
