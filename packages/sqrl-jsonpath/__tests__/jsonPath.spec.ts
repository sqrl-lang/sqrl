/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { register } from "../src";
import { runSqrlTest } from "sqrl";
import { jsonTemplate } from "sqrl-common";

test("works", async () => {
  await runSqrlTest(
    jsonTemplate`
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

ASSERT jsonPath(Data, "$..name") = ${["London", "Berlin", "Madrid", "Rome"]};
ASSERT jsonPath(Data, "$.store.book[*].author") = ${[
      "Nigel Rees",
      "Evelyn Waugh",
      "Herman Melville",
      "J. R. R. Tolkien",
    ]};
ASSERT jsonPath(Data, "$..author") = ${[
      "Nigel Rees",
      "Evelyn Waugh",
      "Herman Melville",
      "J. R. R. Tolkien",
    ]};
ASSERT jsonPath(Data, "$.store.*") = ${[
      [
        {
          author: "Nigel Rees",
          category: "reference",
          price: 8.95,
          title: "Sayings of the Century",
        },
        {
          author: "Evelyn Waugh",
          category: "fiction",
          price: 12.99,
          title: "Sword of Honour",
        },
        {
          author: "Herman Melville",
          category: "fiction",
          isbn: "0-553-21311-3",
          price: 8.99,
          title: "Moby Dick",
        },
        {
          author: "J. R. R. Tolkien",
          category: "fiction",
          isbn: "0-395-19395-8",
          price: 22.99,
          title: "The Lord of the Rings",
        },
      ],
      { color: "red", price: 19.95 },
    ]};
ASSERT jsonPath(Data, "$.store..price") = [8.95, 12.99, 8.99, 22.99, 19.95];
ASSERT jsonPath(Data, "$..book[2]") = ${[
      {
        author: "Herman Melville",
        category: "fiction",
        isbn: "0-553-21311-3",
        price: 8.99,
        title: "Moby Dick",
      },
    ]};
ASSERT jsonPath(Data, "$..book[(@.length-1)]") = ${[
      {
        author: "J. R. R. Tolkien",
        category: "fiction",
        isbn: "0-395-19395-8",
        price: 22.99,
        title: "The Lord of the Rings",
      },
    ]};
ASSERT jsonPath(Data, "$..book[-1:]") = ${[
      {
        author: "J. R. R. Tolkien",
        category: "fiction",
        isbn: "0-395-19395-8",
        price: 22.99,
        title: "The Lord of the Rings",
      },
    ]};
ASSERT jsonPath(Data, "$..book[0,1]") = ${[
      {
        author: "Nigel Rees",
        category: "reference",
        price: 8.95,
        title: "Sayings of the Century",
      },
      {
        author: "Evelyn Waugh",
        category: "fiction",
        price: 12.99,
        title: "Sword of Honour",
      },
    ]};
ASSERT jsonPath(Data, "$..book[:2]") = ${[
      {
        author: "Nigel Rees",
        category: "reference",
        price: 8.95,
        title: "Sayings of the Century",
      },
      {
        author: "Evelyn Waugh",
        category: "fiction",
        price: 12.99,
        title: "Sword of Honour",
      },
    ]};
ASSERT jsonPath(Data, "$..book[?(@.isbn)]") = ${[
      {
        author: "Herman Melville",
        category: "fiction",
        isbn: "0-553-21311-3",
        price: 8.99,
        title: "Moby Dick",
      },
      {
        author: "J. R. R. Tolkien",
        category: "fiction",
        isbn: "0-395-19395-8",
        price: 22.99,
        title: "The Lord of the Rings",
      },
    ]};
ASSERT jsonPath(Data, "$..book[?(@.price<10)]") = ${[
      {
        author: "Nigel Rees",
        category: "reference",
        price: 8.95,
        title: "Sayings of the Century",
      },
      {
        author: "Herman Melville",
        category: "fiction",
        isbn: "0-553-21311-3",
        price: 8.99,
        title: "Moby Dick",
      },
    ]};
ASSERT jsonPath(Data, "$..book[?(@.price==8.95)]") = ${[
      {
        author: "Nigel Rees",
        category: "reference",
        price: 8.95,
        title: "Sayings of the Century",
      },
    ]};
ASSERT jsonPath(Data, "$..book[?(@.price<30 && @.category==\\"fiction\\")]") = ${[
      {
        author: "Evelyn Waugh",
        category: "fiction",
        price: 12.99,
        title: "Sword of Honour",
      },
      {
        author: "Herman Melville",
        category: "fiction",
        isbn: "0-553-21311-3",
        price: 8.99,
        title: "Moby Dick",
      },
      {
        author: "J. R. R. Tolkien",
        category: "fiction",
        isbn: "0-395-19395-8",
        price: 22.99,
        title: "The Lord of the Rings",
      },
    ]};

`,
    {
      register: async (instance) => {
        await register(instance);
      },
    }
  );
});
