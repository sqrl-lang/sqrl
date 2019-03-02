import { runCompile } from "../helpers/runCompile";

/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("config works", async () => {
  // Using the sample config the compile should throw an error
  await expect(
    runCompile({
      "--config": __dirname + "/no-in-memory-config.json"
    })
  ).rejects.toThrowError(
    "No `redis.address` was configured and`state.allow-in-memory` is false."
  );
});
