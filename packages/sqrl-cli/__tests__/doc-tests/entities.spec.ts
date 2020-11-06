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
    LET User := entity('User', '1234')
    User='1234'
    str(date(User))`
    )
  ).toEqual([
    "'1234'",
    "'2019-01-02T03:04:56.789Z'",
    "'2019-01-02T03:04:56.789Z'",
  ]);
});
