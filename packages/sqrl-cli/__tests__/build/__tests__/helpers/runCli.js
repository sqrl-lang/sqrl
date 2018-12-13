"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const invariant_1 = require("sqrl/lib/jslib/invariant");
const CliMain_1 = require("../../src/cli/CliMain");
class StringBuffer extends stream_1.Writable {
    constructor() {
        super(...arguments);
        this.string = "";
    }
    _write(chunk, enc, cb) {
        invariant_1.default(chunk instanceof Buffer, "expected buffer writes");
        this.string += chunk.toString("utf-8");
        cb();
    }
}
async function runCli(args, stdinString) {
    const closeables = new CloseableGroup();
    const stdin = new stream_1.Readable();
    stdin.push(stdinString);
    stdin.push(null);
    const stdout = new StringBuffer();
    try {
        await CliMain_1.cliMain(args, closeables, {
            stdin,
            stdout
        });
    }
    finally {
        closeables.close();
    }
    return stdout.string;
}
exports.runCli = runCli;
