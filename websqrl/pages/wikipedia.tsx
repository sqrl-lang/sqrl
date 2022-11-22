import { StreamPage } from '../components/StreamPage';
import sampleCode from "../src/wikipedia-sample.sqrl";

export default function TwitterPage() {
    return <StreamPage
        urlPrefix='https://sqrl-aws-diffs.s3.amazonaws.com/v1/en.wikipedia.org/'
        extractDate={(payload) => new Date(payload.meta.dt)}
        sampleCode={sampleCode}
    ></StreamPage>;
}