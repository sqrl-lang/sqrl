import { Block, Col, Inline, Row } from "jsxstyle";
import { styleConstants } from "../src/constants";
import type { Result } from "../src/types";
import { StoryResult } from "./StoryResult";

export const BLUESKY_FETCH_FEATURES = [
  "AuthorUsername",
  "AuthorProfileImageUrl",
  "TweetText",
  "TweetId",
  "TweetDate",
] as const;
export type BlueskyFetchFeature = typeof BLUESKY_FETCH_FEATURES[number];

type BlueskyEventStoryProps = Omit<Result<BlueskyFetchFeature>, "type">;

export const BlueskyEventStory: React.FC<BlueskyEventStoryProps> = ({
  features,
  result,
  logs,
}) => {
  const userUrl = `https://twitter.com/${features.AuthorUsername}`;
  const tweetUrl = `https://twitter.com/${features.AuthorUsername}/status/${features.TweetId}`;

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

      <StoryResult result={result} logs={logs}></StoryResult>
    </Col>
  );
};
