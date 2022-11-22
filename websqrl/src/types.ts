export interface WikiEvent {
  meta: {
    uri: string;
    request_id: string;
    id: string;
    dt: string;
    domain: string;
    stream: string;
    topic: string;
    partition: number;
    offset: number;
  };
  id: number;
  type: string;
  namespace: 0;
  title: string;
  comment: string;
  timestamp: number;
  user: string;
  bot: false;
  minor: true;
  length: { old: number; new: number };
  revision: { old: number; new: number };
  server_url: string;
  server_name: string;
  server_script_path: string;
  wiki: string;
  parsedcomment: string;
  content: {
    added: string;
  };
}

export interface CompileRequest {
  type: "compile";
  source: string;
}
export interface EventRequest {
  type: "event";
  event: WikiEvent;
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
  source: string;
}
export interface Render {
  type: "render";
  buffer: Uint8Array;
}
export type Response = CompileOkay | CompileError | RuntimeError | Result;
