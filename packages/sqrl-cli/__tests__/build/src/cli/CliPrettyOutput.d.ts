import { SqrlExecutionState } from "sqrl/lib/execute/SqrlExecutionState";
import { SimpleManipulator } from "sqrl/lib/simple/SimpleManipulator";
import { CliOutputOptions, CliActionOutput } from "./CliOutput";
import { FeatureMap } from "sqrl";
export declare class CliPrettyOutput extends CliActionOutput {
    private options;
    private blocked;
    private allowed;
    private state;
    private summaryInterval;
    private lastSummary;
    private lastCount;
    constructor(options: CliOutputOptions);
    private writeSummary;
    private open;
    private line;
    private errorText;
    close(): void;
    compileError(err: Error): void;
    sourceRecompiling(): void;
    sourceUpdated(): void;
    sourceRecompileError(err: Error): void;
    startStream(): void;
    action(manipulator: SimpleManipulator, execution: SqrlExecutionState, loggedFeatures: FeatureMap): void;
}
