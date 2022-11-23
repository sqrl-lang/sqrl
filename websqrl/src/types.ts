import { FeatureMap } from "sqrl";
import { TweetResult } from "../TweetManipulator";

export interface EventData {
  [key: string]: any;
}

export interface CompileRequest {
  type: "compile";
  source: string;
}
export interface EventRequest {
  type: "event";
  event: EventData;
  requestFeatures: string[];
}
export type Request = CompileRequest | EventRequest;

export interface CompileOkay {
  type: "compileOkay";
  source: string;
}
export interface CompileError {
  type: "compileError";
  message: string;
  source: string;
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
export interface Result {
  type: "result";
  logs: Array<LogEntry>;
  result: TweetResult;
  features: FeatureMap;
  source: string;
}
export interface Render {
  type: "render";
  buffer: Uint8Array;
}
export type Response = CompileOkay | CompileError | RuntimeError | Result;
