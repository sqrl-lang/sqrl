/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrl } from "../helpers/sqrlTest";

test("Loading YAML works", async () => {
  await runSqrl(`
    LET MyData := loadYaml("testdata/sample.yaml");
    ASSERT jsonValue(MyData, "$.string") = "hello world";
    `);
});
