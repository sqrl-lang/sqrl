import { Block, Col, Inline, Row } from "jsxstyle";
import { styleConstants } from "../src/constants";
import type { Result } from "../src/types";
import { StoryResult } from "./StoryResult";

export const BLUESKY_FETCH_FEATURES = [
  "Version",
  "EventName",
  "RecordType",
  "AuthorId",
  "TweetText",
  "TweetId",
  "TweetDate",
  "Subject",
  "SubjectCid",
] as const;
export type BlueskyFetchFeature = typeof BLUESKY_FETCH_FEATURES[number];

type BlueskyEventStoryProps = Omit<Result<BlueskyFetchFeature>, "type">;

export const BlueskyEventStory: React.FC<BlueskyEventStoryProps> = ({
  features,
  result,
  logs,
}) => {
  const userUrl = `https://bsky.app/profile/${features.AuthorId}`;

  if (features.EventName === "create-post") {
    return (
      <Col gap={10}>
        <Row gap={6}>
          <a target="_blank" href={userUrl}>
            Author: {features.AuthorId}
          </a>
          <Inline color={styleConstants.secondary}>
            ({features.TweetDate})
          </Inline>
        </Row>

        {features.TweetText && (
          <Block
            component="blockquote"
            borderLeft="2px solid"
            padding="4px 10px"
            borderColor={styleConstants.secondary}
          >
            {features.TweetText}
          </Block>
        )}

        <StoryResult result={result} logs={logs}></StoryResult>
      </Col>
    );
  }

  return (
    <Col gap={10}>
      <p>Event type: {features.EventName}</p>
      <Row gap={6}>
        <a target="_blank" href={userUrl}>
          Author: {features.AuthorId}
        </a>
        <Inline color={styleConstants.secondary}>({features.TweetDate})</Inline>
      </Row>

      {features.TweetText && (
        <Block
          component="blockquote"
          borderLeft="2px solid"
          padding="4px 10px"
          borderColor={styleConstants.secondary}
        >
          {features.TweetText}
        </Block>
      )}

      {features.SubjectCid ? (
        <p>Subject CID: {features.SubjectCid}</p>
      ) : features.Subject ? (
        <p>Subject: {features.Subject}</p>
      ) : null}

      <StoryResult result={result} logs={logs}></StoryResult>
    </Col>
  );
};
