import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("handles repeated iter", async () => {
  await runSqrlTest(`
    
  LET IntList := [1,2,3];
  LET A := [X + 1 FOR X in IntList];
  LET B := [X + 1 FOR X in IntList WHERE X > 2];
  ASSERT A =  [2, 3, 4];
  ASSERT B = [4];
`);
});

test("handles null in where", async () => {
  await runSqrlTest(`
  LET Sequence := [ [4, 2], [1, 0], [2, null], [3, 1] ];
  LET A := [X FOR X in Sequence WHERE index(X, 1) > 0];
  LET B := [X FOR X in Sequence WHERE index(X, 1) > 5];
  ASSERT A = [ [4,2], [3,1] ];
  ASSERT B = [];
`);
});

test("works with in", async () => {
  await runSqrlTest(`

  # Intersect two sets and then ignore some strings
  LET SequenceA := [ "1", "2", "3", "4", "5" ];
  LET SequenceB := [ "0", "2", "4", "8", "10" ];
  Let IgnoreStrings := ["3", "4", "5"];

  # This makes sure the second part of the AND is not optimized to parallel,
  # and that nodes work within sequences
  LET A := [
    X FOR X IN SequenceA
    WHERE node("Machine", X) IN SequenceB AND NOT X In IgnoreStrings
  ];

  ASSERT A = ["2"];
`);
});

test("where supports sqrl truthy", async () => {
  await runSqrlTest(`

  # Intersect two sets and then ignore some strings
  LET SequenceA := [1, 2, 3, 4, 5, 6];
  LET SequenceB := [0, 2, 4, 6, 8];

  # Do an intersection, but return empty/non-empty array in where clause.
  LET Intersected := [X FOR X IN SequenceA WHERE filter([X IN SequenceB])];

  ASSERT Intersected = [2, 4, 6];
`);
});
