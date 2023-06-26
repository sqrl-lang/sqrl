import Head from "next/head";
import { StreamPage } from "../components/StreamPage";
import {
  BLUESKY_FETCH_FEATURES,
  BlueskyEventStory,
} from "../components/BlueskyEventStory";
import { styleConstants } from "../src/constants";
import sampleCode from "../src/bluesky-sample.sqrl";

export default function TwitterPage() {
  return (
    <>
      <Head>
        <title>Open-source SQRL: Demo running on Blueky firehose</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StreamPage
        urlPrefix="https://sqrl-twitter-stream.s3.amazonaws.com/v1/"
        extractDate={(payload) => new Date(payload.dt)}
        sampleCode={sampleCode}
        storyComponent={BlueskyEventStory}
        fetchFeatures={BLUESKY_FETCH_FEATURES}
        startDateISO={"2023-02-07T09:00Z"}
        shouldLogResult={(result) => result.result.shown}
      >
        This demonstration is running on the
        <a
          style={{
            color: styleConstants.pageLink,
            textDecoration: "underline",
          }}
          href="https://github.com/bluesky-social/feed-generator"
        >
          Bluesky firehose
        </a>
        , and includes some basic example rules.
        <br />
        <br />
        These rules are not recommended for use in production, but are rather
        examples of what can be achieved easily with the language. We also have
        a demonstration running on the{" "}
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
