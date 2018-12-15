/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrlTest } from "../../src/testing/runSqrlTest";

test("works", async () => {
  const { lastState } = await runSqrlTest(`
  LET One := 1;
  LET Six := 6;
  LET Zero := 0;
  LET EmptyList := [];
  LET IntList := [1, 2, 3];
  LET NullFeature := null;

  LET A := {};
  LET B := {"a": 5};
  LET C := {"a": 5 + 1};
  LET D := {"a": 5 + One};
  LET E := {"a": {"c": add(5, Six)}};
  LET F := {"a": {"c": add(5, 6)}};
  LET G := {"a": {"c": (6 / 2) - 1}};

  # This is fake data
  LET H := {
    "http_request": {
      "headers": {
        "x-real-ip": "216.4.4.170"
      }
    },
    "name": "purchase_item",
    "timestamp": "2015-10-12T21:53:04.370Z",
    "session": {
      "actor": {
        "username": "demarion.bauch@hoppe.org",
        "id": 12345,
        "type": "user"
      }
    },
    "machine_fingerprints": {
      "marketplace": 91188146
    },
    "data": {
      "purchase_id": 1849329,
      "item_id": 74213386,
      "credit_card": "3158934446506168"
    }
  };

  ASSERT {} = {};
  ASSERT {"a": {}} = { "a": {} };
  ASSERT {"a": [1, 2]} = { "a": [1, 2] };
  ASSERT {"a": 5 + 4, "b": Six / 2} = { "a": 9, "b": 3 };
  ASSERT C = {"a": 6};
  `);

  expect(
    lastState.getSourcePrinter().getHumanAllSource({
      excludeSlotNumbers: true
    })
  ).toMatchSnapshot();
});
