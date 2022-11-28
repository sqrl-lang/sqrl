import Head from "next/head";
import { StreamPage } from "../components/StreamPage";
import {
  WikipediaEventStory,
  WIKIPEDIA_FETCH_FEATURES,
} from "../components/WikipediaEventStory";
import sampleCode from "../src/wikipedia-sample.sqrl";

export default function WikipediaPage() {
  return (
    <>
      <Head>
        <title>SQRL Wikipedia Demo</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StreamPage
        urlPrefix="https://sqrl-aws-diffs.s3.amazonaws.com/v1/en.wikipedia.org/"
        extractDate={(payload) => new Date(payload.meta.dt)}
        sampleCode={sampleCode}
        storyComponent={WikipediaEventStory}
        fetchFeatures={WIKIPEDIA_FETCH_FEATURES}
        shouldLogResult={(result) => result.result.blocked}
      />
    </>
  );
}
