/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../../helpers/runCli";
import { VirtualFilesystem } from "sqrl-engine";
import * as request from "request-promise-native";

test("works", async () => {
  const filesystem = new VirtualFilesystem({
    "ratelimit.sqrl": `
LET Ip := input();
LET Remaining := rateLimit(BY Ip MAX 2 EVERY 30 SECONDS);
CREATE RULE BlockedByRateLimit WHERE Remaining = 0
  WITH REASON "Saw more than two requests in the last thirty seconds.";
WHEN BlockedByRateLimit THEN blockAction();
`
  });

  let ranTests = false;
  await runCli(["serve", "ratelimit.sqrl", "--port=0"], "", {
    filesystem,
    serverWaitCallback: async ({ server }) => {
      const address = server.address();
      if (typeof address === "string") {
        throw new Error("Expected server to listen on a port");
      }

      const res = await request({
        method: "post",
        uri: `http://127.0.0.1:${address.port}/run`,
        qs: {
          features: "BlockedByRateLimit,Remaining"
        },
        json: true,
        body: {
          Ip: "1.2.3.4"
        }
      });

      expect(res).toEqual({
        allow: true,
        features: { BlockedByRateLimit: false, Remaining: 2 },
        rules: {},
        verdict: { blockRules: [], whitelistRules: [] }
      });
      ranTests = true;
    }
  });
  expect(ranTests).toBeTruthy();
});
