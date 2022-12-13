import { Block, Box } from "jsxstyle";
import Head from "next/head";
import { styleConstants } from "../src/constants";

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>SQRL Demo</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box
        width="100%"
        height="100%"
        gap={10}
        padding={20}
        backgroundColor={styleConstants.pageBackground}
        overflow="hidden"
        color={styleConstants.pageForeground}
      >
        <Block fontSize={26}>SQRL Editor</Block>
        <Block>
          <a href="/twitter">
            View SQRL running on a sampled Twitter live stream
          </a>
        </Block>
      </Box>
    </>
  );
}
