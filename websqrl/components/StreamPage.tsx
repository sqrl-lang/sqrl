import { useEffect, useState, useRef } from "react";
import { invariant } from "../src/invariant";
import {
  addMinutes,
  subMilliseconds,
  startOfMinute,
  differenceInMilliseconds,
} from "date-fns";
import type {
  Request,
  Response,
  EventData,
  Result,
  CompileError,
} from "../src/types";
import { FunctionInfoMap, MonacoEditor } from "../src/MonacoEditor";
import { useMatchMedia, Col, Box, Block, Row } from "jsxstyle";
import { styleConstants } from "../src/constants";
import { Container } from "./Container";
import type { editor } from "monaco-editor";

let LOG_ID = 0;
const DELAY_MS = 60_000 * 3;
const MAX_STORY_FEED_LENGTH = 30;

interface StreamPageProps<T extends string> {
  extractDate: (payload: EventData) => Date;
  fetchFeatures: readonly T[];
  sampleCode: string;
  storyComponent: React.FC<Result<T>>;
  urlPrefix: string;
  shouldLogResult?: (result: Result<T>) => boolean;
}

interface ResultOrMessage<T extends string> {
  value: string | Result<T>;
  key: number;
}

declare global {
  interface Window {
    sqrlInjectData:
      | null
      | ((data: {
          version: string;
          timestamp: string;
          events: EventData[];
        }) => void);
  }
}

export function StreamPage<T extends string>({
  extractDate,
  fetchFeatures,
  sampleCode,
  storyComponent: StoryComponent,
  urlPrefix,
  shouldLogResult = () => true,
}: StreamPageProps<T>): React.ReactElement {
  const workerRef = useRef<Worker | null>();
  const lastSourceRef = useRef<string>();
  const storiesRef = useRef<Array<ResultOrMessage<T>>>([]);
  const lastTimestampRef = useRef<string>();
  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData;
  }>({ status: "pending", message: "Requesting initial compilation…" });

  const [, setLogId] = useState(LOG_ID);
  const [source, setSource] = useState(sampleCode);

  const [sqrlFunctions, setFunctions] = useState<FunctionInfoMap | null>(null);

  const isDarkMode = useMatchMedia("screen and (prefers-color-scheme: dark)");
  const isSmallScreen = useMatchMedia("screen and (max-width: 1000px)");

  function recompile() {
    setCompileStatus({ status: "pending", message: "Recompiling…" });
    lastSourceRef.current = source;
    req({ type: "compile", source });
  }

  if (lastSourceRef.current !== source && workerRef.current) {
    recompile();
  }

  function req(request: Request<T>) {
    workerRef.current!.postMessage(request);
  }

  function append(result: Result<T>) {
    if (storiesRef.current.length === MAX_STORY_FEED_LENGTH) {
      storiesRef.current.pop();
    }
    storiesRef.current.unshift({ value: result, key: LOG_ID++ });
    setLogId(LOG_ID);
  }

  useEffect(() => {
    const scripts: HTMLScriptElement[] = [];

    function startDownload(date: Date) {
      const filename = date
        .toISOString()
        .substring(0, "0000-00-00T00:00".length);
      const script = document.createElement("script");
      script.src = `${urlPrefix}${filename}.js`;
      script.async = true;
      document.body.appendChild(script);
      scripts.push(script);
    }

    let events: EventData[] = [];
    let eventIndex = 0;
    let nextEventTimeout: NodeJS.Timeout;
    let downloadDate = startOfMinute(subMilliseconds(new Date(), DELAY_MS));
    let firstBatch = true;

    function nextEvent() {
      if (eventIndex < events.length) {
        req({
          type: "event",
          event: events[eventIndex],
          requestFeatures: fetchFeatures,
        });
        eventIndex++;
      } else {
        const nextDownload = addMinutes(downloadDate, 1);
        if (delayedMsUntil(nextDownload) <= 0) {
          downloadDate = nextDownload;
          startDownload(downloadDate);
        }
      }
      scheduleNextEvent();
    }

    function delayedMsUntil(nextEventDate: Date) {
      const now = subMilliseconds(new Date(), DELAY_MS);
      return differenceInMilliseconds(nextEventDate, now);
    }

    function scheduleNextEvent() {
      let nextEventDate: Date;
      if (eventIndex < events.length) {
        nextEventDate = new Date(extractDate(events[eventIndex]));
      } else {
        nextEventDate = addMinutes(downloadDate, 1);
      }
      clearTimeout(nextEventTimeout);
      nextEventTimeout = setTimeout(
        nextEvent,
        Math.max(10, delayedMsUntil(nextEventDate))
      );
    }

    window.sqrlInjectData = (data) => {
      // useEffect callbacks are run twice in dev mode, so we need to guard against duplicate data injections here
      if (data.timestamp === lastTimestampRef.current) {
        console.warn(
          "Ignoring injected data with duplicate timestamp %s",
          data.timestamp
        );
        return;
      }

      lastTimestampRef.current = data.timestamp;

      events = data.events;
      eventIndex = 0;

      if (firstBatch) {
        while (eventIndex < events.length) {
          const eventDate = new Date(extractDate(events[eventIndex]));
          if (delayedMsUntil(eventDate) > 0) {
            break;
          }
          eventIndex++;
        }
        firstBatch = false;
      }
      scheduleNextEvent();
    };

    startDownload(downloadDate);

    invariant(!workerRef.current, "Worker created twice");
    workerRef.current = new Worker(
      new URL("../workers/compile.worker", import.meta.url)
    );
    workerRef.current.onmessage = (event) => {
      const res = event.data as Response<T>;
      if (res.type === "sqrlInit") {
        const functionMap = Object.fromEntries(
          res.functions.map((f) => [f.name, f])
        );
        setFunctions(functionMap);
      } else if (res.type === "compileOkay") {
        if (res.source === lastSourceRef.current) {
          setCompileStatus({
            status: "success",
            message: "Compiled! Running...",
          });
        }
      } else if (res.type === "compileError") {
        if (res.source === lastSourceRef.current) {
          setCompileStatus({
            status: "error",
            message: res.message,
            errorMarker: res.location
              ? {
                  message: res.message,
                  severity: 8,
                  startColumn: res.location.start.column,
                  endColumn: res.location.end.column,
                  startLineNumber: res.location.start.line,
                  endLineNumber: res.location.start.line,
                }
              : undefined,
          });
        }
      } else if (res.type === "runtimeError") {
        if (res.source === lastSourceRef.current) {
          setCompileStatus({
            status: "error",
            message: "Error during execution\n\n" + res.message,
          });
        }
      } else if (res.type === "result") {
        if (shouldLogResult(res)) {
          append(res);
        }
      } else {
        console.log("Unknown webworker message:", res);
      }
    };
    recompile();

    return () => {
      clearTimeout(nextEventTimeout);

      scripts.forEach((script) => {
        document.body.removeChild(script);
      });

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      window.sqrlInjectData = null;
    };
  }, []);

  return (
    <Box
      display="flex"
      width="100%"
      height="100%"
      // flip from 2 columns to 2 rows on smaller screens
      flexDirection={isSmallScreen ? "column" : "row"}
      gap={10}
      padding={10}
      backgroundColor={styleConstants.pageBackground}
      overflow="hidden"
      color={styleConstants.pageForeground}
    >
      <Col
        flex="1 1 200px"
        overflow="hidden"
        borderRadius={styleConstants.containerRadius}
        backgroundColor={styleConstants.insetBackground}
        border="1px solid"
        borderColor={styleConstants.containerOutlineColor}
        backgroundClip="padding-box"
      >
        <Row flex="0 0 auto" fontSize={18} gap={20} padding="5px 10px">
          <Block>SQRL Editor</Block>
          <Row gap={5} fontSize={14} fontWeight={500}>
            <Block
              backgroundColor={
                compileStatus.status === "pending"
                  ? "grey"
                  : compileStatus.status === "error"
                  ? "red"
                  : compileStatus.status === "success"
                  ? "green"
                  : null
              }
              height={16}
              width={16}
              borderRadius={8}
            />
            <Block whiteSpace="nowrap" overflow="hidden" flex="1 1 auto">
              {compileStatus.status === "error"
                ? "Compile error"
                : compileStatus.message}
            </Block>
          </Row>
        </Row>
        <MonacoEditor
          style={{ flex: "1 1 auto" }}
          value={source}
          markers={
            compileStatus.errorMarker ? [compileStatus.errorMarker] : undefined
          }
          sqrlFunctions={sqrlFunctions}
          onChange={setSource}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
        />
      </Col>

      <Col flex="1 1 200px" component="ul" overflowY="scroll" gap={10}>
        {storiesRef.current.map((value) =>
          typeof value.value === "string" ? (
            <Container key={value.key}>
              <p>{value.value}</p>
            </Container>
          ) : (
            <Container key={value.key}>
              <StoryComponent {...value.value} />
            </Container>
          )
        )}
      </Col>
    </Box>
  );
}
