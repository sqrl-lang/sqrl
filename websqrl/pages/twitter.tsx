import Head from "next/head";
import { StreamPage } from "../components/StreamPage";
import { TWEET_FETCH_FEATURES, TweetStory } from "../components/TweetStory";
import sampleCode from "../src/twitter-sample.sqrl";

export default function TwitterPage() {
  return (
    <>
      <Head>
        <title>SQRL Twitter Demo</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StreamPage
        urlPrefix="https://sqrl-twitter-stream.s3.amazonaws.com/v1/"
        extractDate={(payload) => new Date(payload.dt)}
        sampleCode={sampleCode}
        storyComponent={TweetStory}
        fetchFeatures={TWEET_FETCH_FEATURES}
        shouldLogResult={(result) => result.result.shown}
      />
    </>
  );
}
