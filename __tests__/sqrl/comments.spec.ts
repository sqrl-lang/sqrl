/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { statementsFromString } from "../../src/helpers/CompileHelpers";

test("comments work in any position", async () => {
  expect(statementsFromString("")).toEqual([]);
  expect(statementsFromString(`\n`)).toEqual([]);
  expect(statementsFromString(`#`)).toEqual([]);
  expect(statementsFromString(`#\n`)).toEqual([]);
  expect(statementsFromString(`\n#`)).toEqual([]);
  expect(statementsFromString(`\n#\n`)).toEqual([]);

  expect(statementsFromString(`--`)).toEqual([]);
  expect(statementsFromString(`--\n`)).toEqual([]);
  expect(statementsFromString(`\n--`)).toEqual([]);
  expect(statementsFromString(`\n--\n`)).toEqual([]);

  expect(
    statementsFromString(`
  let Okay := true;
  # let bla bla!!
      `)
  ).toHaveLength(1);

  expect(
    statementsFromString(`
    let AlsoOkay := false;
    #
    let Okay := true;`)
  ).toHaveLength(2);

  expect(
    statementsFromString(`
    let AlsoOkay := false;
    -- bam bam
    let Okay := true;`)
  ).toHaveLength(2);

  expect(
    statementsFromString(`
    let Okay := true;
    #`)
  ).toHaveLength(1);
});
