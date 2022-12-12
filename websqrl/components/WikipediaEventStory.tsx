import { Block } from "jsxstyle";
import type { Result } from "../src/types";

export const WIKIPEDIA_FETCH_FEATURES = [
  "AuthorUsername",
  "TweetText",
  "TweetId",
  "TweetDate",
] as const;
export type WikipediaFetchFeature = typeof WIKIPEDIA_FETCH_FEATURES[number];

type WikipediaEventStoryProps = Omit<Result<WikipediaFetchFeature>, "type">;

export const WikipediaEventStory: React.FC<WikipediaEventStoryProps> = () => {
  return <Block>hello!</Block>;
};
