/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../helpers/runCli";
import { defaultCliArgs } from "../../src/cli/CliMain";
import * as request from "request-promise-native";

test("works", async () => {
  let ranTests = false;

  await runCli(
    {
      ...defaultCliArgs,
      serve: true,
      "<filename>": __dirname + "/../../../../examples/hello.sqrl",
      "--port": "0"
    },
    "",
    {
      serverWaitCallback: async ({ server }) => {
        const address = server.address();
        if (typeof address === "string") {
          throw new Error("Expected server to listen on a port");
        }

        const res = await request({
          method: "post",
          uri: `http://127.0.0.1:${address.port}/run?features=Text`,
          json: true,
          body: {
            Name: "SQRL Server Test"
          }
        });

        expect(res.features.Text).toEqual("Hello, SQRL Server Test!");
        ranTests = true;
      }
    }
  );

  // The callback logic above is a little tricky, so make sure we actually ran the tests
  expect(ranTests).toBeTruthy();
});
