/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../../helpers/runCli";
import { VirtualFilesystem } from "sqrl";
import * as stripAnsi from "strip-ansi";

test("works", async () => {
  const filesystem = new VirtualFilesystem({
    "samples.sqrl": `
LET SqrlClock := '2019-03-01T01:02:03.456Z';

LET Country := input();
LET CreditCardNum := input();
LET CreditCard := entity("CreditCard", CreditCardNum);
LET RiskyCountry := Country = "ZA";
LET NumRiskyCountries := countUnique(Country BY CreditCard WHERE RiskyCountry LAST DAY);
CREATE RULE MultiRiskyCountryCreditCard WHERE NumRiskyCountries > 0
  WITH REASON "Credit card was used in \${NumRiskyCountries} risky countries in last 5 days.";

WHEN MultiRiskyCountryCreditCard THEN
  blockAction(),
  addLabel(CreditCard, "bad_credit_card");
  `,
  });
  const stdout = await runCli(
    [
      "run",
      "samples.sqrl",
      "-s",
      "Country=ZA",
      "-s",
      "CreditCardNum=1234",
      "NumRiskyCountries",
    ],
    "",
    {
      filesystem,
    }
  );

  // Replace is needed because timezones change the date
  expect(stripAnsi(stdout).replace(/[0-9]/g, "x")).toEqual(
    "✗ xxxx-xx-xx xx:xx action was blocked.\n" +
      "↳ [MultiRiskyCountryCreditCard]: Credit card was used in x risky countries in last x days.\n" +
      "NumRiskyCountries=x\n"
  );
});
