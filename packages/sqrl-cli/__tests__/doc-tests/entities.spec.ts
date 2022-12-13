/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runRepl } from "../helpers/runRepl";

test("works", async () => {
  expect(
    await runRepl(
      [],
      `
      LET ActionData := {"name": "hi", "user_id": "1.2.3.4"};
      LET ActionName := jsonValue(ActionData, "$.name")
      LET UserId := jsonValue(ActionData, "$.user_id")
      LET User := entity('User', UserId)
      featureSource(User)
      User="tom"
      User="1.2.3.4"
      str(date(User))
      `
    )
  ).toEqual([
    "{ name: 'hi', user_id: '1.2.3.4' }",
    "'hi'",
    "'1.2.3.4'",
    "'1.2.3.4'",
    "'function () {\\n' +\n  '  const f0 = () =>\\n' +\n  '    " +
      'functions._entity(this, "User", this.slots["UserId"].value());\\n\' +\n  \'  ' +
      "return this.load(\"UserId\").then(f0);\\n' +\n  '}'",
    "false",
    "true",
    "'2019-01-02T03:04:56.789Z'",
  ]);
});
