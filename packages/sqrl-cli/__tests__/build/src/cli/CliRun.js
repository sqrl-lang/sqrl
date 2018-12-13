"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleManipulator_1 = require("sqrl/lib/simple/SimpleManipulator");
const Semaphore_1 = require("sqrl/lib/jslib/Semaphore");
const split2 = require("split2");
const promiseFinally_1 = require("sqrl/lib/jslib/promiseFinally");
class CliRun {
    constructor(executable, output) {
        this.executable = executable;
        this.output = output;
    }
    triggerRecompile(compileCallback) {
        this.output.sourceRecompiling();
        return compileCallback()
            .then(rv => {
            this.executable = rv;
            this.output.sourceUpdated();
        })
            .catch(err => {
            this.output.sourceRecompileError(err);
        });
    }
    async action(trc, inputs, features) {
        const manipulator = new SimpleManipulator_1.SimpleManipulator();
        const execution = await this.executable.startExecution(trc, {
            featureTimeoutMs: 10000,
            inputs,
            manipulator
        });
        const loggedFeatures = {};
        await Promise.all(features.map(async (featureName) => {
            const value = await execution.fetchByName(featureName);
            loggedFeatures[featureName] = value;
        }));
        await execution.fetchBasicByName("SqrlExecutionComplete");
        await manipulator.mutate(trc);
        this.output.action(manipulator, execution, loggedFeatures);
    }
    async stream(options) {
        const { concurrency } = options;
        const stream = process.stdin.pipe(split2());
        const busy = new Semaphore_1.default();
        stream.on("data", line => {
            const lineValues = Object.assign({}, options.inputs);
            try {
                lineValues[options.streamFeature] = JSON.parse(line);
            }
            catch (err) {
                console.error("Error: Invalid JSON value: %s", JSON.stringify(line) + err.toString());
                return;
            }
            promiseFinally_1.promiseFinally(busy.wrap(this.action(options.ctx, lineValues, options.features).catch(err => {
                console.error("Error: " + err.toString());
            })), () => {
                stream.resume();
            });
            if (concurrency && busy.getCount() === concurrency) {
                stream.pause();
            }
        });
        await new Promise((resolve, reject) => {
            stream.on("end", () => resolve());
            stream.on("error", err => reject(err));
        });
        await busy.waitForZero();
    }
    close() {
        this.output.close();
    }
}
exports.CliRun = CliRun;
