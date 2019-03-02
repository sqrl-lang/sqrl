import { runCompile } from "../helpers/runCompile";

/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("repl works", async () => {
  const output = await runCompile();
  expect(JSON.parse(output)).toMatchSnapshot();
});
