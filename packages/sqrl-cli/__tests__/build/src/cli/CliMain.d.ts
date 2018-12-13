/// <reference types="node" />
import { CliOutput } from "./CliOutput";
import { Readable, Writable } from "stream";
import { CloseableGroup } from "../jslib/Closeable";
export declare const CliDoc = "\nUsage:\n  sqrl [options] print <filename> [(-s <key=value>)...]\n  sqrl [options] run <filename> [--stream=<feature>] [(-s <key=value>)...] [<feature>...]\n  sqrl [options] repl [<filename> [(-s <key=value>)...]]\n  sqrl [options] serve [--port=<port>] <filename>\n  sqrl [options] compile <filename> [(-s <key=value>)...]\n  sqrl [options] test <filename>\n\nOptions:\n  --stream=<feature>     Stream inputs to the given feature from stdin as newline seperated json\n  --concurrency=<N>      Limit actions processed in parallel [default: 50]\n  --compiled             Read compiled SQRL rather than source\n  --only-blocked         Only show blocked actions\n  --ratelimit=<address>  Address of ratelimit server\n  --redis=<address>      Address of redis server\n  --output=<output>      Output format [default: pretty]\n";
export declare const defaultCliArgs: CliArgs;
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
export declare class CliError extends Error {
}
export declare function getCliOutput(args: CliArgs, stdout?: Writable): CliOutput;
export declare function cliMain(args: CliArgs, closeables: CloseableGroup, options?: {
    output?: CliOutput;
    stdin?: Readable;
    stdout?: Writable;
}): Promise<void>;
