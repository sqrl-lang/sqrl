/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as path from "path";
import { runSqrlTest, LocalFilesystem } from "sqrl";
import { register } from "../src";

test("Loading YAML works", async () => {
  const filesystem = new LocalFilesystem(path.join(__dirname, "testdata"));

  await runSqrlTest(
    `
    LET MyData := loadYaml("sample.yaml");
    ASSERT jsonValue(MyData, "$.string") = "hello world";
    `,
    {
      filesystem,
      register: async instance => {
        await register(instance);
      }
    }
  );
});
