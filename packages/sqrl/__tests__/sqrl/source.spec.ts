/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrlTest } from "../../src/testing/runSqrlTest";

function cleanSource(source) {
  const lines = source.split("\n");

  // Remove all empty starting/ending lines
  while (lines.length && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  // Calculate common indent
  let indent = lines[0].length;
  lines.forEach(line => {
    const [spaces] = /^ */.exec(line);
    indent = Math.min(indent, spaces.length);
  });

  // Remove indent and return joined
  return lines.map(line => line.slice(indent)).join("\n");
}
function sourceTemplate(strings: TemplateStringsArray, ...args: any[]): string {
  return strings.reduce((accum: string, part: string, idx: number) => {
    return accum + JSON.stringify(cleanSource(args[idx - 1])) + part;
  });
}

test("saves features", async () => {
  await runSqrlTest(sourceTemplate`
    LET Result := 5;
    ASSERT source(Result) = ${`
      function() {
        return bluebird.resolve(5);
      }
    `};

    LET X := 5;
    LET Y := 4;
    LET Z := 2;
    LET Result := (X * Y) / (Z - 1);
    # @NOTE: divide() is not pure for now as it deals with divide by zero
    ASSERT source(Result) = ${`
      function() {
        return bluebird.resolve(functions.divide(this, 20, 1));
      }
    `};


    # Make sure whichever way we OR the two functions, we re-sort them to
    # perform the faster operation first. This depends on function cost, but
    # even with defaults slow has two calls to the same function so should have
    # a higher cost.
    LET Slow := delayMs(100, delayMs(50, "Hello!"));
    LET Fast := delayMs(10, "Hello!");
    LET Choice1 := Slow OR Fast;
    LET Choice2 := Fast OR Slow;
    ASSERT source(Choice1) = source(Choice2);
    ASSERT source(Choice1) = ${`
      function() {
        const f0 = () =>
          functions._orSequential(this, [
            () => bluebird.resolve(this.slots["Fast"].value()),
            () => this.fetch("Slow")
          ]);
        return this.load("Fast").then(f0);
      }
    `};

    LET List := [Fast, Slow];
    ASSERT source(List) = ${`
      function() {
        return this.load(\"Fast\", \"Slow\");
      }
    `};
  `);
});
