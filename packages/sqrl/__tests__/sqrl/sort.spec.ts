/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "works",
  `
  ASSERT sort([]) = [];

  ASSERT sort([1]) = [1];
  ASSERT sort([1, 2]) = [1, 2];
  ASSERT sort([2, 1]) = [1, 2];
  ASSERT sort([1, 10, 2]) = [1, 2, 10];

  ASSERT sort(["a", "c", "b"]) = ["a", "b", "c"];
  ASSERT sort(["1", "10", "2"]) = ["1", "10", "2"];
  `
);
