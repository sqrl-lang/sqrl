"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqrlCompile_1 = require("sqrl/lib/compile/SqrlCompile");
const SqrlParserState_1 = require("sqrl/lib/compile/SqrlParserState");
const FunctionRegistry_1 = require("sqrl/lib/function/FunctionRegistry");
const registerAllFunctions_1 = require("sqrl/lib/function/registerAllFunctions");
const SqrlCompiledOutput_1 = require("sqrl/lib/compile/SqrlCompiledOutput");
const invariant_1 = require("sqrl/lib/jslib/invariant");
const SqrlServer_1 = require("../SqrlServer");
const SqrlTest_1 = require("sqrl/lib/testing/SqrlTest");
const SqrlRepl_1 = require("sqrl/lib/repl/SqrlRepl");
const SimpleManipulator_1 = require("sqrl/lib/simple/SimpleManipulator");
const filesystem_1 = require("sqrl/lib/api/filesystem");
const path = require("path");
const waitForSigint = require("wait-for-sigint");
const SimpleBlockService_1 = require("sqrl/lib/simple/SimpleBlockService");
const SqrlObject_1 = require("sqrl/lib/object/SqrlObject");
const ComparisonFunctions_1 = require("sqrl/lib/function/ComparisonFunctions");
const SqrlAst_1 = require("sqrl/lib/ast/SqrlAst");
const ServiceHelpers_1 = require("sqrl/lib/helpers/ServiceHelpers");
const CompileHelpers_1 = require("sqrl/lib/helpers/CompileHelpers");
const ContextHelpers_1 = require("sqrl/lib/helpers/ContextHelpers");
const SimpleLogService_1 = require("sqrl/lib/simple/SimpleLogService");
const WatchedSourceTree_1 = require("./WatchedSourceTree");
const CliPrettyOutput_1 = require("./CliPrettyOutput");
const CliRun_1 = require("./CliRun");
const Semaphore_1 = require("sqrl/lib/jslib/Semaphore");
const CliOutput_1 = require("./CliOutput");
const log_1 = require("sqrl/lib/api/log");
const DatabaseSet_1 = require("sqrl/lib/platform/DatabaseSet");
const Trace_1 = require("sqrl/lib/platform/Trace");
const fs_1 = require("fs");
const util_1 = require("util");
const sqrl_text_functions_1 = require("sqrl-text-functions");
const SQRL = require("sqrl");
const readFileAsync = util_1.promisify(fs_1.readFile);
exports.CliDoc = `
Usage:
  sqrl [options] print <filename> [(-s <key=value>)...]
  sqrl [options] run <filename> [--stream=<feature>] [(-s <key=value>)...] [<feature>...]
  sqrl [options] repl [<filename> [(-s <key=value>)...]]
  sqrl [options] serve [--port=<port>] <filename>
  sqrl [options] compile <filename> [(-s <key=value>)...]
  sqrl [options] test <filename>

Options:
  --stream=<feature>     Stream inputs to the given feature from stdin as newline seperated json
  --concurrency=<N>      Limit actions processed in parallel [default: 50]
  --compiled             Read compiled SQRL rather than source
  --only-blocked         Only show blocked actions
  --ratelimit=<address>  Address of ratelimit server
  --redis=<address>      Address of redis server
  --output=<output>      Output format [default: pretty]
`;
exports.defaultCliArgs = {
    "--output": "pretty",
    "--concurrency": "50",
    "<feature>": [],
    "<key=value>": []
};
class CliError extends Error {
}
exports.CliError = CliError;
async function readJsonFile(filename) {
    const data = await readFileAsync(filename, { encoding: "utf-8" });
    return JSON.parse(data);
}
async function createLabeler(ctx, functionRegistry, sourceTree, filename, inputs = {}) {
    const parserState = new SqrlParserState_1.SqrlParserState(Object.assign({}, (await CompileHelpers_1.sourceOptionsFromFilesystem(sourceTree, path.basename(filename))), { functionRegistry, setInputs: inputs }));
    SqrlCompile_1.compileParserStateAst(parserState);
    const compiledOutput = new SqrlCompiledOutput_1.SqrlCompiledOutput(parserState);
    const spec = await compiledOutput.buildLabelerSpec(ctx);
    return {
        executable: CompileHelpers_1.executableFromSpec(functionRegistry, spec),
        compiledOutput,
        spec
    };
}
function getCliOutput(args, stdout = process.stdout) {
    const outputOptions = {
        stdout,
        onlyBlocked: args["--only-blocked"]
    };
    if (args["--output"] === "pretty") {
        if (args.compile) {
            return new CliOutput_1.CliSlotJsOutput(stdout);
        }
        else {
            return new CliPrettyOutput_1.CliPrettyOutput(outputOptions);
        }
    }
    else if (args["--output"] === "csv") {
        return new CliOutput_1.CliCsvOutput(outputOptions);
    }
    else if (args["--output"] === "json") {
        return new CliOutput_1.CliJsonOutput(outputOptions);
    }
    else if (args["--output"] === "expr") {
        return new CliOutput_1.CliExprOutput(stdout);
    }
    else if (args["--output"] === "slot-js") {
        return new CliOutput_1.CliSlotJsOutput(stdout);
    }
    else {
        throw new Error("Unknown output type: " + args["--output"]);
    }
}
exports.getCliOutput = getCliOutput;
function getInputs(args) {
    const inputs = {};
    args["<key=value>"].forEach(pair => {
        const [key] = pair.split("=", 1);
        try {
            const value = JSON.parse(pair.substring(key.length + 1));
            inputs[key] = value;
        }
        catch (err) {
            throw new CliError(`Invalid JSON value for feature: ${key}`);
        }
    });
    return inputs;
}
class CliAssertService {
    compare(left, operator, right, arrow) {
        if (!ComparisonFunctions_1.sqrlCompare(left, operator, right)) {
            console.error("Assertion failed:", left, operator, right);
            console.error(arrow);
            process.exit(1);
        }
    }
    ok(value, arrow) {
        if (!SqrlObject_1.default.isTruthy(value)) {
            console.error("Assertion failed:", value);
            console.error(arrow);
            process.exit(1);
        }
    }
}
const shutdown = [];
function buildFunctionRegistry(args) {
    const services = ServiceHelpers_1.buildServicesFromAddresses({
        ratelimitAddress: args["--ratelimit"] || process.env.RATELIMIT,
        redisAddress: args["--redis"] || process.env.REDIS,
        inMemory: true
    });
    shutdown.push(services);
    services.assert = new CliAssertService();
    services.block = new SimpleBlockService_1.SimpleBlockService();
    services.log = new SimpleLogService_1.SimpleLogService();
    const functionRegistry = new FunctionRegistry_1.default();
    registerAllFunctions_1.registerAllFunctions(functionRegistry, services);
    sqrl_text_functions_1.register(new SQRL.FunctionRegistry(functionRegistry));
    return { functionRegistry, services };
}
async function cliMain(args, closeables, options = {}) {
    const defaultTrc = ContextHelpers_1.createDefaultContext();
    const inputs = getInputs(args);
    let output;
    if (options.output) {
        output = options.output;
    }
    else {
        output = getCliOutput(args, options.stdout || process.stdout);
        closeables.add(output);
    }
    if (args.test) {
        const { filesystem, source } = await CompileHelpers_1.sourceOptionsFromPath(args["<filename>"]);
        const { functionRegistry, services } = buildFunctionRegistry(args);
        const test = new SqrlTest_1.SqrlTest(functionRegistry, {
            filesystem,
            manipulatorFactory: () => new SimpleManipulator_1.SimpleManipulator()
        });
        const testId = await services.uniqueId.create(defaultTrc);
        const ctx = new Trace_1.SimpleContext(new DatabaseSet_1.SimpleDatabaseSet(testId.getNumberString()), log_1.getGlobalLogger());
        await test.run(ctx, source);
    }
    else if (args.compile ||
        args.run ||
        args.serve ||
        args.print ||
        args.repl) {
        const ctx = defaultTrc;
        const { functionRegistry } = buildFunctionRegistry(args);
        let executable = null;
        let spec = null;
        let compiledOutput = null;
        let watchedSource = null;
        let sourceTree;
        if (args["--stream"]) {
            watchedSource = new WatchedSourceTree_1.WatchedSourceTree(path.dirname(args["<filename>"]));
            sourceTree = watchedSource;
        }
        else if (args["<filename>"]) {
            sourceTree = new filesystem_1.LocalFilesystem(path.dirname(args["<filename>"]));
        }
        async function loadSource() {
            if (args["--compiled"]) {
                spec = await readJsonFile(args["<filename>"]);
                return {
                    executable: CompileHelpers_1.executableFromSpec(functionRegistry, spec),
                    spec: null,
                    compiledOutput: null
                };
            }
            else {
                return createLabeler(ctx, functionRegistry, sourceTree, args["<filename>"], inputs);
            }
        }
        let run;
        const compilingLock = new Semaphore_1.default({ max: 1 });
        await compilingLock.take();
        if (args.run) {
            if (args["--stream"]) {
                watchedSource.on("change", async () => {
                    await compilingLock.take();
                    try {
                        await run.triggerRecompile(() => {
                            return loadSource().then(rv => rv.executable);
                        });
                    }
                    finally {
                        compilingLock.release();
                    }
                });
            }
        }
        if (args["<filename>"]) {
            ({ executable, spec, compiledOutput } = await loadSource());
        }
        if (args.run) {
            if (!(output instanceof CliOutput_1.CliActionOutput)) {
                throw new Error("Output format not compatible with `run`");
            }
            run = new CliRun_1.CliRun(executable, output);
            compilingLock.release();
            if (args["--stream"]) {
                output.startStream();
                let concurrency = null;
                if (args["--concurrency"]) {
                    concurrency = parseInt(args["--concurrency"], 10);
                }
                await run.stream({
                    ctx,
                    inputs,
                    concurrency,
                    streamFeature: args["--stream"],
                    features: args["<feature>"]
                });
            }
            else {
                await run.action(ctx, inputs, args["<feature>"]);
            }
            run.close();
        }
        else if (args.print) {
            executable.sourcePrinter.printAllSource();
        }
        else if (args.compile) {
            if (!(output instanceof CliOutput_1.CliCompileOutput)) {
                throw new Error("Output format not compatible with `compile`");
            }
            invariant_1.default(compiledOutput, "Compile options must include a filename");
            await output.compiled(spec, compiledOutput);
        }
        else if (args.repl) {
            let filesystem = new filesystem_1.LocalFilesystem(process.cwd());
            const statements = [];
            if (executable) {
                ({ filesystem } = await CompileHelpers_1.sourceOptionsFromPath(args["<filename>"]));
                statements.push(SqrlAst_1.default.include(path.basename(args["<filename>"])));
            }
            const test = new SqrlTest_1.SqrlTest(functionRegistry, {
                filesystem,
                manipulatorFactory: () => new SimpleManipulator_1.SimpleManipulator()
            });
            await test.runStatements(ctx, statements);
            const repl = new SqrlRepl_1.SqrlRepl(functionRegistry, test, {
                traceFactory: () => ctx,
                stdin: options.stdin,
                stdout: options.stdout
            });
            repl.start();
            await new Promise(resolve => {
                repl.on("exit", resolve);
            });
        }
        else if (args.serve) {
            const port = parseInt(args["--port"] || "2288", 10);
            invariant_1.default(!isNaN(port), "port must be a number");
            console.log("Serving", args["<filename>"], "on port", port);
            const server = SqrlServer_1.createSqrlServer(ctx, executable);
            server.listen(port);
            await waitForSigint();
            server.close();
        }
        else {
            throw new Error("Unknown cli command");
        }
    }
    else {
        throw new Error("Unknown cli command");
    }
}
exports.cliMain = cliMain;
