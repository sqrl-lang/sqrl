import { StreamPage } from "../components/StreamPage";
import sampleCode from "../src/twitter-sample.sqrl";

export default function TwitterPage() {
  return (
    <StreamPage
      urlPrefix="https://sqrl-twitter-stream.s3.amazonaws.com/v1/"
      extractDate={(payload) => new Date(payload.dt)}
      sampleCode={sampleCode}
    ></StreamPage>
  );
}
