"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const chalk_1 = require("chalk");
const SqrlObject_1 = require("sqrl/lib/object/SqrlObject");
const util = require("util");
const parse_1 = require("sqrl/lib/api/parse");
const CliOutput_1 = require("./CliOutput");
const CHECKMARK = "\u2713";
const CROSS = "\u2717";
const DOWNWARDS_ARROW = "\u21b3";
var State;
(function (State) {
    State[State["none"] = 1] = "none";
    State[State["unknown"] = 2] = "unknown";
    State[State["recompiling"] = 3] = "recompiling";
    State[State["summary"] = 4] = "summary";
})(State || (State = {}));
function prefixLines(text, prefix) {
    return prefix + text.replace(/\n/g, "\n" + prefix);
}
class CliPrettyOutput extends CliOutput_1.CliActionOutput {
    constructor(options) {
        super(options.stdout);
        this.options = options;
        this.blocked = 0;
        this.allowed = 0;
        this.state = State.none;
        this.lastCount = 0;
        this.lastSummary = Date.now();
    }
    writeSummary() {
        const count = this.blocked + this.allowed;
        const perMin = (count - this.lastCount) / ((Date.now() - this.lastSummary) / 60000);
        let speed;
        if (perMin < 1000) {
            speed = `${perMin.toFixed(1)}/min`;
        }
        else {
            speed = `${(perMin / 60).toFixed(1)}/sec`;
        }
        if (this.state !== State.summary) {
            this.open(State.summary);
        }
        this.line(moment().format("YYYY-MM-DD HH:mm:ss ") +
            chalk_1.default.red(`${this.blocked} actions blocked`) +
            ", " +
            chalk_1.default.green(`${this.allowed} actions allowed`) +
            chalk_1.default.gray(` (${speed})`));
        this.lastCount = count;
        this.lastSummary = Date.now();
    }
    open(state = State.unknown) {
        if (this.state !== State.none) {
            process.stdout.write("\n");
        }
        this.state = state;
    }
    line(format, ...param) {
        process.stdout.write(util.format(format, ...param) + "\n");
    }
    errorText(err) {
        if (err instanceof parse_1.SqrlCompileError) {
            return err.toSqrlErrorOutput({
                codedError: false,
                source: true,
                stacktrace: false
            });
        }
        else {
            return err.stack;
        }
    }
    close() {
        if (this.summaryInterval) {
            this.writeSummary();
            clearInterval(this.summaryInterval);
            this.summaryInterval = null;
        }
    }
    compileError(err) {
        this.line(this.errorText(err));
    }
    sourceRecompiling() {
        this.open(State.recompiling);
        this.line(chalk_1.default.yellow("Source changed, recompiling..."));
    }
    sourceUpdated() {
        if (this.state === State.recompiling) {
            this.state = State.unknown;
        }
        else {
            this.open();
        }
        this.line(chalk_1.default.green("Source updated."));
    }
    sourceRecompileError(err) {
        if (this.state === State.recompiling) {
            this.state = State.unknown;
        }
        else {
            this.open();
        }
        this.line(chalk_1.default.redBright("New source failed to compile:"));
        this.line(prefixLines(this.errorText(err), chalk_1.default.red(">") + " "));
    }
    startStream() {
        this.summaryInterval = setInterval(() => this.writeSummary(), 1000);
        this.summaryInterval.unref();
    }
    action(manipulator, execution, loggedFeatures) {
        if (manipulator.wasBlocked()) {
            this.blocked += 1;
        }
        else {
            this.allowed += 1;
        }
        if (this.options.onlyBlocked && !manipulator.wasBlocked()) {
            return;
        }
        this.open();
        const timestamp = moment(execution.getClock());
        const time = " " + chalk_1.default.gray(timestamp.format("YYYY-MM-DD HH:mm")) + " ";
        if (manipulator.wasBlocked()) {
            this.line(chalk_1.default.red.bold(CROSS) + time + chalk_1.default.red("action was blocked."));
            manipulator.blockedRules.forEach(details => {
                this.line(chalk_1.default.red(`${DOWNWARDS_ARROW} [${details.name}]` +
                    (details.reason ? ": " + details.reason : "")));
            });
        }
        else {
            this.line(chalk_1.default.green(CHECKMARK) + time + chalk_1.default.green("action was allowed."));
        }
        Object.assign(loggedFeatures, manipulator.loggedFeatures);
        for (const key of Object.keys(loggedFeatures).sort()) {
            const value = loggedFeatures[key];
            if (value instanceof SqrlObject_1.default) {
                this.line("%s=%s %s", key, JSON.stringify(value.getBasicValue()), value.renderText().trimRight());
            }
            else {
                this.line("%s=%s", key, JSON.stringify(value));
            }
        }
        manipulator.logged.forEach(message => this.line(message));
    }
}
exports.CliPrettyOutput = CliPrettyOutput;
