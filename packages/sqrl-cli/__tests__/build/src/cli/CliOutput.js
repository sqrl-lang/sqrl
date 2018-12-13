"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsonStableStringify = require("fast-stable-stringify");
const ContextHelpers_1 = require("sqrl/lib/helpers/ContextHelpers");
const sqrl_1 = require("sqrl");
class CliOutput {
    constructor(stdout) {
        this.stdout = stdout;
    }
    close() {
        return;
    }
    compileError(err) {
        console.error("Compile failed: " + err.toString());
    }
    sourceRecompiling() {
        return;
    }
    sourceUpdated() {
        console.error("Source updated.");
    }
    sourceRecompileError(err) {
        console.error("Source recompile failed: " + err.toString());
    }
}
exports.CliOutput = CliOutput;
class CliCompileOutput extends CliOutput {
}
exports.CliCompileOutput = CliCompileOutput;
class CliExprOutput extends CliCompileOutput {
    async compiled(spec, compiledOutput) {
        const { slotNames, slotExprs } = await compiledOutput.fetchBuildOutput(ContextHelpers_1.createDefaultContext());
        this.stdout.write(jsonStableStringify({
            slotExprs: slotExprs.map(expr => sqrl_1.serializeExpr(expr)),
            slotNames
        }) + "\n");
    }
}
exports.CliExprOutput = CliExprOutput;
class CliSlotJsOutput extends CliCompileOutput {
    async compiled(spec, compiledOutput) {
        console.log(jsonStableStringify(spec));
    }
}
exports.CliSlotJsOutput = CliSlotJsOutput;
class CliActionOutput extends CliOutput {
}
exports.CliActionOutput = CliActionOutput;
class CliJsonOutput extends CliActionOutput {
    constructor(options) {
        super(options.stdout);
        this.options = options;
    }
    startStream() {
    }
    action(manipulator, execution, loggedFeatures) {
        if (this.options.onlyBlocked) {
            if (manipulator.wasBlocked()) {
                return;
            }
        }
        console.log(JSON.stringify(loggedFeatures));
    }
}
exports.CliJsonOutput = CliJsonOutput;
class CliCsvOutput extends CliActionOutput {
    constructor(options) {
        super(options.stdout || process.stdout);
        this.options = options;
    }
    startStream() {
    }
    action(manipulator, execution, loggedFeatures) {
        if (this.options.onlyBlocked) {
            if (manipulator.wasBlocked()) {
                return;
            }
        }
        throw new Error("CSV output is not implemented yet.");
    }
}
exports.CliCsvOutput = CliCsvOutput;
