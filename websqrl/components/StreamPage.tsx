import { useEffect, useState, useRef, useReducer } from "react";
import { invariant } from "../src/invariant";
import type { Request, Response, Result, StatusResponse } from "../src/types";
import { FunctionInfoMap, MonacoEditor } from "../src/MonacoEditor";
import { useMatchMedia, Col, Box, Block, Row, css } from "jsxstyle";
import { styleConstants } from "../src/constants";
import { Container } from "./Container";
import type { editor } from "monaco-editor";
import { Playhead, PlayheadSpeed } from "./Playhead";

const MAX_STORY_FEED_LENGTH = 30;

interface StreamPageProps<T extends string> {
  dateFieldName: string;
  fetchFeatures: readonly T[];
  sampleCode: string;
  storyComponent: React.FC<Result<T>>;
  urlPrefix: string;
  shouldLogResult?: (result: Result<T>) => boolean;
  children: React.ReactNode;
}

interface ResultOrMessage<T extends string> {
  value: string | Result<T>;
  key: number;
}

const storiesReducer: React.Reducer<
  {
    index: number;
    stories: ResultOrMessage<string>[];
  },
  { action: "reset" } | { action: "append"; value: string | Result<string> }
> = (state, action) => {
  if (action.action === "reset") {
    return {
      index: 0,
      stories: [],
    };
  } else if (action.action === "append") {
    const key = state.index + 1;
    return {
      index: key,
      stories: [{ key, value: action.value }, ...state.stories].slice(
        0,
        MAX_STORY_FEED_LENGTH
      ),
    };
  } else {
    throw new Error("Unhandled action");
  }
};

const statusReducer: React.Reducer<
  Omit<StatusResponse, "type">,
  Omit<StatusResponse, "type">
> = (state, action) => {
  if (
    action.timestamp !== state.timestamp ||
    action.total !== state.total ||
    action.currentIndex + 1 === action.total ||
    // slow down state updates a bit
    (action.currentIndex + 1) % 10 === 0
  ) {
    return action;
  }
  return state;
};

export function StreamPage<T extends string>({
  dateFieldName,
  fetchFeatures,
  sampleCode,
  storyComponent: StoryComponent,
  urlPrefix,
  shouldLogResult = () => true,
  children,
}: StreamPageProps<T>): React.ReactElement {
  const workerRef = useRef<Worker | null>();
  const lastSourceRef = useRef<string>();
  const [storyObjects, setStories] = useReducer(storiesReducer, {
    index: 0,
    stories: [],
  });
  const [showDetails, setShowDetails] = useState(false);
  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData;
  }>({ status: "pending", message: "Requesting initial compilation…" });

  const [playheadSpeed, setPlayheadSpeed] = useState<PlayheadSpeed>(0);
  const [status, setStatus] = useReducer(statusReducer, {
    currentIndex: 0,
    total: 0,
    timestamp: "",
  });

  const [source, setSource] = useState(sampleCode);

  const [sqrlFunctions, setFunctions] = useState<FunctionInfoMap | null>(null);

  const isDarkMode = useMatchMedia("screen and (prefers-color-scheme: dark)");
  const isSmallScreen = useMatchMedia("screen and (max-width: 1000px)");

  function recompile() {
    setCompileStatus({ status: "pending", message: "Recompiling…" });
    lastSourceRef.current = source;
    req({ type: "compile", source });
  }

  function setTimestamp(timestamp: number) {
    req({ type: "playhead", position: new Date(timestamp) });
    setStories({ action: "reset" });
  }

  function init() {
    setCompileStatus({ status: "pending", message: "Recompiling…" });
    lastSourceRef.current = source;
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 11);
    req({
      type: "init",
      source,
      dateFieldName: dateFieldName,
      fetchFeatures,
      speed: playheadSpeed,
      cursor: startDate,
      urlPrefix,
    });
  }

  if (lastSourceRef.current !== source && workerRef.current) {
    recompile();
  }

  function req(request: Request<T>) {
    workerRef.current!.postMessage(request);
  }

  function append(result: Result<T>) {
    setStories({ action: "append", value: result });
  }

  useEffect(() => {
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
      } else if (res.type === "status") {
        setStatus(res);
      } else {
        console.log("Unknown webworker message:", res);
      }
    };
    init();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const linkStyle = {
    color: styleConstants.pageLink,
    textDecoration: "underline",
  };

  return (
    <Col width="100%" height="100%">
      <Box
        display="flex"
        flex="1 1 auto"
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
            <Block fontSize={14} whiteSpace="nowrap" marginLeft="auto">
              <a href="#" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? (
                  <>Hide Language Details &uarr;</>
                ) : (
                  <>Show Language Details &darr;</>
                )}
              </a>
            </Block>
          </Row>
          {showDetails && (
            <>
              <Row
                padding={10}
                display="block"
                borderLeftColor={styleConstants.pageForeground}
                borderLeftWidth="2px"
                borderLeftStyle="solid"
              >
                SQRL was the language designed by Smyte, and later acquired by
                Twitter in 2018. It is a safe, stateful language for event
                streams, designed to make it easy to enforce anti-abuse rules.
                <br />
                <br />
                {children}
                <br />
                <br />
                For more information see{" "}
                <a style={linkStyle} href="https://sqrl-lang.github.io/sqrl/">
                  the website
                </a>
                , or{" "}
                <a
                  style={linkStyle}
                  href="https://sqrl-lang.github.io/sqrl/motivation.html"
                >
                  the motivation
                </a>
                .
              </Row>
              <Row padding={10} fontSize={12}>
                <a href="#" onClick={() => setShowDetails(false)}>
                  <>Hide Language Details &uarr;</>
                </a>
              </Row>
            </>
          )}
          <MonacoEditor
            className={css({ flex: "1 1 auto" })}
            value={source}
            markers={
              compileStatus.errorMarker
                ? [compileStatus.errorMarker]
                : undefined
            }
            sqrlFunctions={sqrlFunctions}
            onChange={setSource}
            isDarkMode={isDarkMode}
          />
        </Col>

        <Col flex="1 1 200px" component="ul" overflowY="scroll" gap={10}>
          {storyObjects.stories.map((value) =>
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
      <Playhead
        setTimestamp={setTimestamp}
        speed={playheadSpeed}
        setSpeed={setPlayheadSpeed}
        status={status}
      />
    </Col>
  );
}
