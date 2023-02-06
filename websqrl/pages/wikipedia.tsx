import Head from "next/head";
import { StreamPage } from "../components/StreamPage";
import {
  WikipediaEventStory,
  WIKIPEDIA_FETCH_FEATURES,
} from "../components/WikipediaEventStory";
import { styleConstants } from "../src/constants";
import sampleCode from "../src/wikipedia-sample.sqrl";

export default function WikipediaPage() {
  return (
    <>
      <Head>
        <title>
          Open-source SQRL: Demo running on Wikipedia recent changes
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StreamPage
        urlPrefix="https://sqrl-aws-diffs.s3.amazonaws.com/v1/en.wikipedia.org/"
        extractDate={(payload) => new Date(payload.meta.dt)}
        sampleCode={sampleCode}
        storyComponent={WikipediaEventStory}
        fetchFeatures={WIKIPEDIA_FETCH_FEATURES}
        shouldLogResult={(result) => result.result.shown}
      >
        This demonstration is running on the Wikipedia{" "}
        <a
          style={{
            color: styleConstants.pageLink,
            textDecoration: "underline",
          }}
          href="https://www.mediawiki.org/wiki/API:Recent_changes_stream"
        >
          Recent Changes Stream
        </a>
        , and include some basic example rules.
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
          href="/twitter"
        >
          Twitter event stream
        </a>
        .
      </StreamPage>
    </>
  );
}
