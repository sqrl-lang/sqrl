/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { register } from "../src";
import { runSqrlTest } from "sqrl";

test("works", async () => {
  await runSqrlTest(
    `
    LET DataBlob := {
      "0": "a",
      "array": [1, 2],
      "key": 0,
      "nested": {
        "key": 1
      },
      "key_2": 2,
      "null": null,
    };
    LET Complex := {
      "a-b": [
        {
          'c."': {
            "'": "OKAY!"
          }
        }
      ]
    };

    ASSERT jsonValue(DataBlob, "$.key") = 0;
    ASSERT jsonValue(DataBlob, "$.key_2") = 2;
    ASSERT jsonValue(DataBlob, "$.nested.key") = 1;
    ASSERT jsonValue(DataBlob, "$.nested.missing") = null;
    ASSERT jsonValue(DataBlob, "$.null") = null;
    ASSERT jsonValue(DataBlob, "$.missing") = null;
    ASSERT jsonValue(DataBlob, "$.array") = [1, 2];
    ASSERT jsonValue(DataBlob, "$.array[0]") = 1;
    ASSERT jsonValue(DataBlob, "$.array[1]") = 2;
    ASSERT jsonValue(DataBlob, \"$['array']\") = [1, 2];
    ASSERT jsonValue(DataBlob, "$[\\"array\\"]") = [1, 2];
    ASSERT jsonValue(DataBlob, "$[0]") = "a";
    ASSERT jsonValue(Complex, "$['a-b'][0]['c.\\\\\\"']['\\\\'']") = "OKAY!";
`,
    {
      register: async instance => {
        await register(instance);
      }
    }
  );
});
