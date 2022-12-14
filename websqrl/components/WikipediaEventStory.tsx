import { Block, Col, Inline, Row } from "jsxstyle";
import { styleConstants } from "../src/constants";
import type { Result } from "../src/types";
import { StoryResult } from "./StoryResult";

export const WIKIPEDIA_FETCH_FEATURES = [
  "DiffUrl",
  "User",
  "SqrlClock",
  "AddedContent",
  "PageUrl",
  "Title",
] as const;
export type WikipediaFetchFeature = typeof WIKIPEDIA_FETCH_FEATURES[number];

type WikipediaEventProps = Omit<Result<WikipediaFetchFeature>, "type">;

export const WikipediaEventStory: React.FC<WikipediaEventProps> = ({
  features,
  result,
  logs,
}) => {
  const userUrl = `https://en.wikipedia.org/wiki/User:${encodeURIComponent(
    features.User
  )}`;

  return (
    <Col gap={10}>
      <Row gap={6}>
        <Inline fontWeight="bold">
          <a target="_blank" href={features.PageUrl}>
            {features.Title}
          </a>
        </Inline>
        by
        <Inline>
          <a target="_blank" href={userUrl}>
            {features.User}
          </a>
        </Inline>
        <Inline color={styleConstants.secondary}>
          (
          <a href={features.DiffUrl} target="_blank">
            {features.SqrlClock}
          </a>
          )
        </Inline>
      </Row>

      <Block
        component="blockquote"
        borderLeft="2px solid"
        padding="4px 10px"
        borderColor={styleConstants.secondary}
        maxHeight="120px"
        overflow="auto"
      >
        {features.AddedContent}
      </Block>

      <StoryResult result={result} logs={logs}></StoryResult>
    </Col>
  );
};
