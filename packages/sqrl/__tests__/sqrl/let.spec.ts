/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  runCompile,
  compileToExecution,
  fetchExecutableFeature
} from "../helpers/runCompile";
import { buildTestInstance } from "../../src/testing/runSqrlTest";
import { executableFromFilesystem, VirtualFilesystem } from "../../src";
import { runSqrlTest } from "../../src/simple/runSqrlTest";

test("supports basic statements", async () => {
  await expect(
    runCompile(`
LET A := FeatureOne + 1;
  `)
  ).rejects.toThrowError(/Feature was not defined: FeatureOne/);

  await expect(
    runCompile(`
LET FeatureOne := 1;
LET A := FeatureOne + 1;
LET A := FeatureOne + 2;
  `)
  ).rejects.toMatchSnapshot("multiple-definitions");

  const { execution } = await compileToExecution(`
LET FeatureOne := 1;
LET A := FeatureOne + 1;
_resetReplaceableFeatures();
LET A := FeatureOne + 2;
  `);

  await expect(execution.fetchBasicByName("A")).resolves.toEqual(3);
});

test("supports where clauses", async () => {
  const { executable } = await runCompile(`
  LET Select := input();
  LET A := 1 WHERE Select="one";
  LET A := 2 WHERE Select="two";
    `);

  await expect(
    fetchExecutableFeature(executable, "A", {
      inputs: {
        Select: "one"
      }
    })
  ).resolves.toEqual(1);
  await expect(
    fetchExecutableFeature(executable, "A", {
      inputs: {
        Select: "two"
      }
    })
  ).resolves.toEqual(2);

  await runSqrlTest(`
  LET TestActionName := '';
  LET Ip := '1.2.3.4' WHERE TestActionName = 'login';
  LET Ip := '5.6.7.8' WHERE TestActionName = 'signup';
  ASSERT Ip IS NULL;

  LET TestActionName := 'login';
  ASSERT Ip = '1.2.3.4';

  LET TestActionName := 'boom';
  LET IsPing := TestActionName = 'ping';
  LET IsPong := TestActionName = 'pong';
  LET Ball := 'red' WHERE IsPing or IsPong;
  LET Ball := 'blue' WHERE not (IsPing or IsPong);
  ASSERT Ball = 'blue';
  `);
});

test("supports where default values", async () => {
  await runSqrlTest(`
    LET TestActionName := '';
    LET Ip := 'loginIp' WHERE TestActionName = 'login';
    LET Ip := 'signupIp' WHERE TestActionName = 'signup';
    LET Ip := 'defaultIp' DEFAULT;
    ASSERT Ip = 'defaultIp';

    LET TestActionName := 'login';
    ASSERT Ip = 'loginIp';

    LET TestActionName := 'boom';
    ASSERT Ip = 'defaultIp';`);

  await expect(
    executableFromFilesystem(
      await buildTestInstance(),
      new VirtualFilesystem({
        "main.sqrl": `
    LET Act := "b";
    INCLUDE "a.sqrl" WHERE Act="a";
    ASSERT Act="c";
  `,
        "a.sqrl": `
  LET Something := "x" DEFAULT;
  `
      })
    )
  ).rejects.toThrow(
    /LET statement with DEFAULT is not valid in file included with WHERE/
  );

  const executable = await executableFromFilesystem(
    await buildTestInstance(),
    new VirtualFilesystem({
      "main.sqrl": `
    LET Choose := input();
    INCLUDE "default.sqrl";
    INCLUDE "red.sqrl" WHERE Choose="red";
    INCLUDE "blue.sqrl" WHERE Choose="blue";
  `,
      "default.sqrl": 'LET Color := "none" DEFAULT;',
      "blue.sqrl": 'LET Color := "cloudy blue";',
      "red.sqrl": 'LET Color := "deep dark red";'
    })
  );

  await expect(
    fetchExecutableFeature(executable._wrapped, "Color", {
      inputs: {
        Choose: "pink"
      }
    })
  ).resolves.toEqual("none");
  await expect(
    fetchExecutableFeature(executable._wrapped, "Color", {
      inputs: {
        Choose: "red"
      }
    })
  ).resolves.toEqual("deep dark red");
  await expect(
    fetchExecutableFeature(executable._wrapped, "Color", {
      inputs: {
        Choose: "blue"
      }
    })
  ).resolves.toEqual("cloudy blue");
});
