import { Block } from "jsxstyle";
import { styleConstants } from "../src/constants";
import type { LogEntry } from "../src/types";
import { WebSQRLResult } from "../TweetManipulator";

export const StoryResult: React.FC<{
  result: WebSQRLResult;
  logs: LogEntry[];
}> = ({ result, logs }) => {
  const messages = [];
  for (const msg of logs) {
    messages.push(
      msg.args
        .map((value) => {
          if (typeof value === "string") {
            return value;
          } else {
            return JSON.stringify(value);
          }
        })
        .join(" ")
    );
  }

  return (
    <>
      {result.shown && result.shownCause && (
        <Block color={styleConstants.secondary}>
          <Block>Rules fired</Block>
          <Block component="ul" listStyle="inside">
            {result.shownCause.firedRules.map((rule) => (
              <li key={rule.name}>
                {rule.name}
                {rule.reason ? ": " + rule.reason : null}
              </li>
            ))}
          </Block>
        </Block>
      )}

      {messages.length ? (
        <Block color={styleConstants.secondary}>
          <Block>
            {messages.length || "No"} logged message
            {messages.length === 1 ? "" : "s"}
          </Block>
          <Block component="ul" listStyle="inside">
            {messages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </Block>
        </Block>
      ) : null}
    </>
  );
};
