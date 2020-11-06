import { runSqrlTest } from "../../src";

/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("works", async () => {
  let aTick = null;
  let bTick = null;
  let tick = 0;
  async function register(instance) {
    instance.registerSync(function a(rv) {
      aTick = tick++;
      return rv;
    });
    instance.registerSync(function b(rv) {
      bTick = tick++;
      return rv;
    });
  }

  const statements = [
    "ASSERT (a(false) OR b(false)) = false;",
    "ASSERT (a(true) AND b(true)) = true;",
    "LET A := a(false); LET B := b(false); ASSERT (A or B)  = false;",
    "LET A := a(true);  LET B := b(true);  ASSERT (A AND B) = true;",
  ];

  for (const statement of statements) {
    tick = 0;

    // A is mentioned first in all the statements so when everything else is equal- should be first.
    await runSqrlTest(statement, { register });
    expect(aTick).toEqual(0);
    expect(bTick).toEqual(1);

    await runSqrlTest(statement, {
      register,
      functionCost: {
        a: 1000,
        b: 1,
      },
    });
    expect(aTick).toEqual(3);
    expect(bTick).toEqual(2);

    await runSqrlTest(statement, {
      register,
      functionCost: {
        a: 1,
        b: 1000,
      },
    });
    expect(aTick).toEqual(4);
    expect(bTick).toEqual(5);
  }
});
