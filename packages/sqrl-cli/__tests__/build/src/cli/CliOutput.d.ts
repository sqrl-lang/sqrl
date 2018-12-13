/// <reference types="node" />
import { SimpleManipulator } from "sqrl/lib/simple/SimpleManipulator";
import { SqrlExecutionState } from "sqrl/lib/execute/SqrlExecutionState";
import { SqrlCompiledOutput } from "sqrl/lib/compile/SqrlCompiledOutput";
import { LabelerSpec } from "sqrl/lib/execute/LabelerSpec";
import { Writable } from "stream";
import { FeatureMap } from "sqrl";
export interface CliOutputOptions {
    stdout?: Writable;
    onlyBlocked?: boolean;
}
export declare abstract class CliOutput {
    protected stdout: Writable;
    constructor(stdout: Writable);
    close(): void;
    compileError(err: Error): void;
    sourceRecompiling(): void;
    sourceUpdated(): void;
    sourceRecompileError(err: Error): void;
}
export declare abstract class CliCompileOutput extends CliOutput {
    abstract compiled(spec: LabelerSpec, compiledOutput: SqrlCompiledOutput): Promise<void>;
}
export declare class CliExprOutput extends CliCompileOutput {
    compiled(spec: LabelerSpec, compiledOutput: SqrlCompiledOutput): Promise<void>;
}
export declare class CliSlotJsOutput extends CliCompileOutput {
    compiled(spec: LabelerSpec, compiledOutput: SqrlCompiledOutput): Promise<void>;
}
export declare abstract class CliActionOutput extends CliOutput {
    abstract startStream(): any;
    abstract action(manipulator: SimpleManipulator, execution: SqrlExecutionState, loggedFeatures: FeatureMap): any;
}
export declare class CliJsonOutput extends CliActionOutput {
    private options;
    constructor(options: CliOutputOptions);
    startStream(): void;
    action(manipulator: SimpleManipulator, execution: SqrlExecutionState, loggedFeatures: FeatureMap): void;
}
export declare class CliCsvOutput extends CliActionOutput {
    private options;
    constructor(options: CliOutputOptions);
    startStream(): void;
    action(manipulator: SimpleManipulator, execution: SqrlExecutionState, loggedFeatures: FeatureMap): void;
}
