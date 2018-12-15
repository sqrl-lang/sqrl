/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrlTest } from "../../src/testing/runSqrlTest";
import { LocalFilesystem } from "../../src/api/filesystem";
import * as path from "path";

test("Loading YAML works", async () => {
  const filesystem = new LocalFilesystem(path.join(__dirname, ".."));

  await runSqrlTest(
    `
    LET MyData := loadYaml("testdata/sample.yaml");
    ASSERT jsonValue(MyData, "$.string") = "hello world";
    `,
    { filesystem }
  );
});
