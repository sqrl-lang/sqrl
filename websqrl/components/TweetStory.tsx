import { Block, Col, Inline, Row } from "jsxstyle";
import { useMemo } from "react";
import { sprintf } from "sprintf-js";
import { styleConstants } from "../src/constants";
import type { Result } from "../src/types";

export const TWEET_FETCH_FEATURES = [
  "AuthorUsername",
  "AuthorProfileImageUrl",
  "TweetText",
  "TweetId",
  "TweetDate",
] as const;
export type TweetFetchFeature = typeof TWEET_FETCH_FEATURES[number];

type TweetStoryProps = Omit<Result<TweetFetchFeature>, "type">;

export const TweetStory: React.FC<TweetStoryProps> = ({
  features,
  result,
  logs,
}) => {
  const userUrl = `https://twitter.com/${features.AuthorUsername}`;
  const tweetUrl = `https://twitter.com/${features.AuthorUsername}/status/${features.TweetId}`;

  const messages = [];
  for (const msg of logs) {
    messages.push(sprintf(msg.format, ...msg.args));
  }

  return (
    <Col gap={10}>
      <Row gap={6}>
        <Block
          backgroundImage={`url("${features.AuthorProfileImageUrl}")`}
          backgroundPosition="center center"
          backgroundSize="contain"
          height={40}
          width={40}
          borderRadius={4}
        />

        <a target="_blank" href={userUrl}>
          @{features.AuthorUsername}
        </a>
        <Inline color={styleConstants.secondary}>
          (
          <a href={tweetUrl} target="_blank">
            {features.TweetDate}
          </a>
          )
        </Inline>
      </Row>

      <Block
        component="blockquote"
        borderLeft="2px solid"
        padding="4px 10px"
        borderColor={styleConstants.secondary}
      >
        {features.TweetText}
      </Block>

      {result.blocked && (
        <Block color={styleConstants.secondary}>
          <Block>Rules fired</Block>
          <Block component="ul" listStyle="inside">
            {result.blockedCause.firedRules.map((rule) => (
              <li key={rule.name}>
                {rule.name}
                {rule.reason ? ": " + rule.reason : null}
              </li>
            ))}
          </Block>
        </Block>
      )}

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
    </Col>
  );
};
