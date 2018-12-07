/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
import { compileParserStateAst } from "../compile/SqrlCompile";
import { SqrlParserState } from "../compile/SqrlParserState";
import FunctionRegistry from "../function/FunctionRegistry";
import {
  registerAllFunctions,
  FunctionServices
} from "../function/registerAllFunctions";
import { SqrlCompiledOutput } from "../compile/SqrlCompiledOutput";
import { SqrlExecutable } from "../execute/SqrlExecutable";
import { FeatureMap } from "../feature/FeatureTypes";
import invariant from "../jslib/invariant";
import { createSqrlServer } from "../simple/SqrlServer";
import { SqrlTest } from "../testing/SqrlTest";
import { SqrlRepl } from "../repl/SqrlRepl";

import { SimpleManipulator } from "../simple/SimpleManipulator";
import { LocalFilesystem, Filesystem } from "../api/filesystem";
import * as path from "path";
import * as waitForSigint from "wait-for-sigint";
import { LabelerSpec } from "../execute/LabelerSpec";
import { SimpleBlockService } from "../simple/SimpleBlockService";
import { AssertService } from "../function/AssertFunctions";
import SqrlObject from "../object/SqrlObject";
import { sqrlCompare } from "../function/ComparisonFunctions";
import SqrlAst from "../ast/SqrlAst";
import { StatementAst } from "../ast/Ast";
import { buildServicesFromAddresses } from "../helpers/ServiceHelpers";
import {
  executableFromSpec,
  sourceOptionsFromPath,
  sourceOptionsFromFilesystem
} from "../helpers/CompileHelpers";
import { createDefaultContext } from "../helpers/ContextHelpers";
import { SimpleLogService } from "../simple/SimpleLogService";
import { WatchedSourceTree } from "../cli/WatchedSourceTree";
import { CliPrettyOutput } from "../cli/CliPrettyOutput";
import { CliRun } from "../cli/CliRun";
import Semaphore from "../jslib/Semaphore";
import {
  CliActionOutput,
  CliCsvOutput,
  CliOutputOptions,
  CliJsonOutput,
  CliOutput,
  CliCompileOutput,
  CliExprOutput,
  CliSlotJsOutput
} from "../cli/CliOutput";
import { Context } from "../api/ctx";
import { getGlobalLogger } from "../api/log";
import { SimpleDatabaseSet } from "../platform/DatabaseSet";
import { SimpleContext } from "../platform/Trace";
import { readFile } from "fs";
import { promisify } from "util";
import { CloseableGroup } from "../jslib/Closeable";
import { Readable, Writable } from "stream";
const readFileAsync = promisify(readFile);

export const CliDoc = `
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

export const defaultCliArgs: CliArgs = {
  "--output": "pretty",
  "--concurrency": "50",
  "<feature>": [],
  "<key=value>": []
};

export interface CliArgs {
  compile?: boolean;
  execute?: boolean;
  run?: boolean;
  serve?: boolean;
  print?: boolean;
  repl?: boolean;
  test?: boolean;
  "<filename>"?: string;
  "<feature>": string[];
  "<key=value>": string[];
  "--redis"?: string;
  "--ratelimit"?: string;
  "--compiled"?: boolean;
  "--output": string;
  "--concurrency": string;
}

export class CliError extends Error {}

async function readJsonFile(filename: string) {
  const data = await readFileAsync(filename, { encoding: "utf-8" });
  return JSON.parse(data);
}

async function createLabeler(
  ctx: Context,
  functionRegistry: FunctionRegistry,
  sourceTree: Filesystem,
  filename: string,
  inputs: FeatureMap = {}
) {
  const parserState = new SqrlParserState({
    ...(await sourceOptionsFromFilesystem(sourceTree, path.basename(filename))),
    functionRegistry,
    setInputs: inputs
  });
  compileParserStateAst(parserState);
  const compiledOutput = new SqrlCompiledOutput(parserState);
  const spec = await compiledOutput.buildLabelerSpec(ctx);
  return {
    executable: executableFromSpec(functionRegistry, spec),
    compiledOutput,
    spec
  };
}

export function getCliOutput(args: CliArgs): CliOutput {
  const outputOptions: CliOutputOptions = {
    onlyBlocked: args["--only-blocked"]
  };
  if (args["--output"] === "pretty") {
    if (args.compile) {
      return new CliSlotJsOutput();
    } else {
      return new CliPrettyOutput(outputOptions);
    }
  } else if (args["--output"] === "csv") {
    return new CliCsvOutput(outputOptions);
  } else if (args["--output"] === "json") {
    return new CliJsonOutput(outputOptions);
  } else if (args["--output"] === "expr") {
    return new CliExprOutput();
  } else if (args["--output"] === "slot-js") {
    return new CliSlotJsOutput();
  } else {
    throw new Error("Unknown output type: " + args["--output"]);
  }
}

function getInputs(args: CliArgs) {
  const inputs = {};
  args["<key=value>"].forEach(pair => {
    const [key] = pair.split("=", 1);
    try {
      const value = JSON.parse(pair.substring(key.length + 1));
      inputs[key] = value;
    } catch (err) {
      throw new CliError(`Invalid JSON value for feature: ${key}`);
    }
  });
  return inputs;
}

class CliAssertService implements AssertService {
  compare(left: any, operator: string, right: any, arrow: string) {
    if (!sqrlCompare(left, operator, right)) {
      console.error("Assertion failed:", left, operator, right);
      console.error(arrow);
      process.exit(1);
    }
  }
  ok(value: any, arrow: string) {
    if (!SqrlObject.isTruthy(value)) {
      console.error("Assertion failed:", value);
      console.error(arrow);
      process.exit(1);
    }
  }
}

const shutdown = [];

function buildFunctionRegistry(
  args: CliArgs
): {
  functionRegistry: FunctionRegistry;
  services: FunctionServices;
} {
  const services: FunctionServices = buildServicesFromAddresses({
    ratelimitAddress: args["--ratelimit"] || process.env.RATELIMIT,
    redisAddress: args["--redis"] || process.env.REDIS,
    inMemory: true
  });

  shutdown.push(services);

  services.assert = new CliAssertService();
  services.block = new SimpleBlockService();
  services.log = new SimpleLogService();

  const functionRegistry = new FunctionRegistry();
  registerAllFunctions(functionRegistry, services);
  return { functionRegistry, services };
}

export async function cliMain(
  args: CliArgs,
  output: CliOutput,
  closeables: CloseableGroup,
  options: {
    stdin?: Readable;
    stdout?: Writable;
  } = {}
) {
  const defaultTrc = createDefaultContext();
  const inputs = getInputs(args);

  if (args.test) {
    const { filesystem, source } = await sourceOptionsFromPath(
      args["<filename>"]
    );
    const { functionRegistry, services } = buildFunctionRegistry(args);
    const test = new SqrlTest(functionRegistry, {
      filesystem,
      manipulatorFactory: () => new SimpleManipulator()
    });

    // Create a new unique id for this test
    const testId = await services.uniqueId.create(defaultTrc);
    const ctx = new SimpleContext(
      new SimpleDatabaseSet(testId.getNumberString()),
      getGlobalLogger()
    );

    await test.run(ctx, source);
  } else if (
    args.compile ||
    args.run ||
    args.serve ||
    args.print ||
    args.repl
  ) {
    const ctx = defaultTrc;

    const { functionRegistry } = buildFunctionRegistry(args);
    // <filename> is sqrl source code
    let executable: SqrlExecutable | null = null;
    let spec: LabelerSpec = null;
    let compiledOutput: SqrlCompiledOutput = null;

    let watchedSource: WatchedSourceTree = null;
    let sourceTree: Filesystem;
    if (args["--stream"]) {
      watchedSource = new WatchedSourceTree(path.dirname(args["<filename>"]));
      sourceTree = watchedSource;
    } else if (args["<filename>"]) {
      sourceTree = new LocalFilesystem(path.dirname(args["<filename>"]));
    }

    /***
     * Return the loaded source code. This should not be done inside the async
     * function as we want to log the moment the change occurs.
     */
    async function loadSource() {
      if (args["--compiled"]) {
        spec = await readJsonFile(args["<filename>"]);
        return {
          executable: executableFromSpec(functionRegistry, spec),
          spec: null,
          compiledOutput: null
        };
      } else {
        return createLabeler(
          ctx,
          functionRegistry,
          sourceTree,
          args["<filename>"],
          inputs
        );
      }
    }

    let run: CliRun;

    // Lock to ensure we only compile once at a time
    const compilingLock = new Semaphore({ max: 1 });
    await compilingLock.take();

    if (args.run) {
      if (args["--stream"]) {
        watchedSource.on("change", async () => {
          await compilingLock.take();
          try {
            await run.triggerRecompile(() => {
              return loadSource().then(rv => rv.executable);
            });
          } finally {
            compilingLock.release();
          }
        });
      }
    }

    if (args["<filename>"]) {
      ({ executable, spec, compiledOutput } = await loadSource());
    }

    if (args.run) {
      if (!(output instanceof CliActionOutput)) {
        throw new Error("Output format not compatible with `run`");
      }
      run = new CliRun(executable, output);
      compilingLock.release();

      if (args["--stream"]) {
        let concurrency: number = null;
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
      } else {
        await run.action(ctx, inputs, args["<feature>"]);
      }

      run.close();
    } else if (args.print) {
      executable.sourcePrinter.printAllSource();
    } else if (args.compile) {
      if (!(output instanceof CliCompileOutput)) {
        throw new Error("Output format not compatible with `compile`");
      }
      await output.compiled(spec, compiledOutput);
    } else if (args.repl) {
      let filesystem: Filesystem = new LocalFilesystem(process.cwd());
      const statements: StatementAst[] = [];
      if (executable) {
        ({ filesystem } = await sourceOptionsFromPath(args["<filename>"]));
        statements.push(SqrlAst.include(path.basename(args["<filename>"])));
      }
      const test = new SqrlTest(functionRegistry, {
        filesystem,
        manipulatorFactory: () => new SimpleManipulator()
      });
      await test.runStatements(ctx, statements);
      const repl = new SqrlRepl(functionRegistry, test, {
        traceFactory: () => ctx,
        stdin: options.stdin,
        stdout: options.stdout
      });
      repl.start();
      await new Promise(resolve => {
        repl.on("exit", resolve);
      });
    } else if (args.serve) {
      const port = parseInt(args["--port"] || "2288", 10);
      invariant(!isNaN(port), "port must be a number");
      console.log("Serving", args["<filename>"], "on port", port);
      const server = createSqrlServer(ctx, executable);
      server.listen(port);
      await waitForSigint();
      server.close();
    } else {
      throw new Error("Unknown cli command");
    }
  } else {
    throw new Error("Unknown cli command");
  }
}
