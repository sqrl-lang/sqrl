/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "./helpers/sqrlTest";

sqrlTest(
  "jsonPath works",
  `

LET Data := {
  "$ip": "1.2.3.4",
  "store": {
    "book": [
      {
        "category": "reference",
        "author": "Nigel Rees",
        "title": "Sayings of the Century",
        "price": 8.95
      }, {
        "category": "fiction",
        "author": "Evelyn Waugh",
        "title": "Sword of Honour",
        "price": 12.99
      }, {
        "category": "fiction",
        "author": "Herman Melville",
        "title": "Moby Dick",
        "isbn": "0-553-21311-3",
        "price": 8.99
      }, {
        "category": "fiction",
        "author": "J. R. R. Tolkien",
        "title": "The Lord of the Rings",
        "isbn": "0-395-19395-8",
        "price": 22.99
      }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  },
  "cities": [
    { "name": "London", "population": 8615246 },
    { "name": "Berlin", "population": 3517424 },
    { "name": "Madrid", "population": 3165235 },
    { "name": "Rome",   "population": 2870528 }
  ]
};

ASSERT jsonValue(Data, "$.$ip") = "1.2.3.4";
ASSERT jsonPath(Data, "$.cities..name") = [];

`
);
