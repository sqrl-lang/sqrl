"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runCli_1 = require("../helpers/runCli");
const CliMain_1 = require("../../src/cli/CliMain");
test("repl works", async () => {
    const output = await runCli_1.runCli(Object.assign({}, CliMain_1.defaultCliArgs, { compile: true, "--output": "expr", "<filename>": __dirname + "/../../../../samples/hello.sqrl" }), "");
    expect(JSON.parse(output)).toMatchSnapshot();
});
