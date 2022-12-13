import { FeatureMap, FunctionInfo } from "sqrl";
import { TweetResult } from "../TweetManipulator";

export interface EventData {
  [key: string]: any;
}

export interface CompileRequest {
  type: "compile";
  source: string;
}
export interface EventRequest<T extends string> {
  type: "event";
  event: EventData;
  requestFeatures: readonly T[];
}
export type Request<T extends string> = CompileRequest | EventRequest<T>;

export interface SqrlInit {
  type: "sqrlInit";
  functions: FunctionInfo[];
}

export interface CompileOkay {
  type: "compileOkay";
  source: string;
}

interface Location {
  column: number;
  line: number;
  offset: number;
}

export interface CompileError {
  type: "compileError";
  stack: string;
  message: string;
  source: string;
  location: Record<"start" | "end", Location> | undefined;
}
export interface RuntimeError {
  type: "runtimeError";
  message: string;
  source: string;
}
export interface LogEntry {
  format: string;
  args: any[];
}
export interface Result<T extends string> {
  type: "result";
  logs: Array<LogEntry>;
  result: TweetResult;
  features: FeatureMap<T>;
  source: string;
}
export interface Render {
  type: "render";
  buffer: Uint8Array;
}
export type Response<T extends string> =
  | SqrlInit
  | CompileOkay
  | CompileError
  | RuntimeError
  | Result<T>;
