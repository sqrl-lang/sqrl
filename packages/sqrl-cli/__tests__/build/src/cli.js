#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docopt_1 = require("docopt");
const CliMain_1 = require("./cli/CliMain");
const promiseFinally_1 = require("sqrl/lib/jslib/promiseFinally");
const Closeable_1 = require("./jslib/Closeable");
const args = docopt_1.docopt(CliMain_1.CliDoc, {
    version: 0.1
});
const output = CliMain_1.getCliOutput(args);
const closeables = new Closeable_1.CloseableGroup();
let exitCode = 1;
promiseFinally_1.promiseFinally(CliMain_1.cliMain(args, closeables, { output })
    .catch(err => {
    output.compileError(err);
})
    .then(() => {
    exitCode = 0;
}), () => {
    closeables.close();
    process.exit(exitCode);
});
