import Head from "next/head";
import { StreamPage } from "../components/StreamPage";
import { TWEET_FETCH_FEATURES, TweetStory } from "../components/TweetStory";
import { styleConstants } from "../src/constants";
import sampleCode from "../src/twitter-sample.sqrl";

export default function TwitterPage() {
  return (
    <>
      <Head>
        <title>Open-source SQRL: Demo running on Twitter sampled stream</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StreamPage
        urlPrefix="https://sqrl-twitter-stream.s3.amazonaws.com/v1/"
        extractDate={(payload) => new Date(payload.dt)}
        sampleCode={sampleCode}
        storyComponent={TweetStory}
        fetchFeatures={TWEET_FETCH_FEATURES}
        startDateISO={"2023-02-07T09:00Z"}
        shouldLogResult={(result) => result.result.shown}
      >
        This demonstration is running on the Twitter{" "}
        <a
          style={{
            color: styleConstants.pageLink,
            textDecoration: "underline",
          }}
          href="https://developer.twitter.com/en/docs/twitter-api/tweets/volume-streams/introduction"
        >
          1% sampled stream
        </a>
        , and include some basic example rules. To see the tweets live on
        twitter.com follow the timestamp link.
        <br />
        <br />
        These are not recommended for use in production, but are rather examples
        of what can be achieved easily with the language. We also have a
        demonstration running on the{" "}
        <a
          style={{
            color: styleConstants.pageLink,
            textDecoration: "underline",
          }}
          href="/wikipedia"
        >
          Wikipedia event stream
        </a>
        .
      </StreamPage>
    </>
  );
}
