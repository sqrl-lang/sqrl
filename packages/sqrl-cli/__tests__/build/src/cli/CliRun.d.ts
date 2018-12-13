import { SqrlExecutable } from "sqrl/lib/execute/SqrlExecutable";
import { CliActionOutput } from "./CliOutput";
import { Context } from "sqrl/lib/api/ctx";
import { FeatureMap } from "sqrl";
export declare class CliRun {
    private executable;
    private output;
    constructor(executable: SqrlExecutable, output: CliActionOutput);
    triggerRecompile(compileCallback: () => Promise<SqrlExecutable>): Promise<void>;
    action(trc: Context, inputs: FeatureMap, features: string[]): Promise<void>;
    stream(options: {
        ctx: Context;
        streamFeature: string;
        concurrency: number;
        inputs: FeatureMap;
        features: string[];
    }): Promise<void>;
    close(): void;
}
