import { FeatureMap, FunctionInfo } from "sqrl";
import { WebSQRLResult } from "../TweetManipulator";
import type { EventDomainOptions } from "./EventDomain";

export interface EventData {
  [key: string]: any;
}

export interface CompileRequest {
  type: "compile";
  source: string;
}

export interface InitRequest<T extends string> extends EventDomainOptions {
  type: "init";
  source: string;
  fetchFeatures: readonly T[];
}

export interface ConfigureRequest<T extends string>
  extends Omit<InitRequest<T>, "type" | "urlPrefix"> {
  type: "configure";
}

export interface PlayheadRequest {
  type: "playhead";
  position: Date;
}

export type Request<T extends string> =
  | CompileRequest
  | InitRequest<T>
  | ConfigureRequest<T>
  | PlayheadRequest;

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
  args: any[];
}

export interface Result<T extends string> {
  type: "result";
  logs: Array<LogEntry>;
  result: WebSQRLResult;
  features: FeatureMap<T>;
  source: string;
}

export interface StatusResponse {
  type: "status";
  currentIndex: number;
  total: number;
  timestamp: string;
}

export type Response<T extends string> =
  | SqrlInit
  | CompileOkay
  | CompileError
  | RuntimeError
  | StatusResponse
  | Result<T>;
