import { Block } from "jsxstyle";
import { useEffect, useRef, useState } from "react";
import { getFileNameForDate } from "../src/getFileNameForDate";
import { StatusResponse } from "../src/types";

export type PlayheadSpeed = "realtime" | number;

interface PlayheadProps {
  speed: PlayheadSpeed;
  status: Omit<StatusResponse, "type"> | undefined;
  setSpeed: (speed: PlayheadSpeed) => void;
  setTimestamp: (timestamp: number) => void;
}

const tenMinutePx = 200;
const oneMinuteMs = 1000 * 60;
const tenMinutesMs = 10 * oneMinuteMs;
// give event processing a minute to upload latest data to S3
const windowBuffer = 11 * oneMinuteMs;

export const Playhead: React.FC<PlayheadProps> = ({ setTimestamp, status }) => {
  const [playheadWidth, setPlayheadWidth] = useState<number>(0);
  const playheadContainerElementRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date().valueOf());

  useEffect(() => {
    const nowTimer = setInterval(() => {
      setNow(new Date().valueOf());
    }, 5000);

    return () => clearInterval(nowTimer);
  });

  useEffect(() => {
    const ref = playheadContainerElementRef.current;
    if (!ref) return;
    const resizeObserver = new ResizeObserver((things) => {
      for (const thing of things) {
        if (thing.target !== ref) continue;
        setPlayheadWidth(thing.contentRect.width);
      }
    });

    resizeObserver.observe(ref);
    return () => {
      resizeObserver.unobserve(ref);
      resizeObserver.disconnect();
    };
  }, [playheadContainerElementRef.current]);

  const totalElements = Math.max(playheadWidth / tenMinutePx);
  const playheadElements = Array.from({ length: totalElements }).map(
    (_, index) => {
      const windowDate = new Date(now - tenMinutesMs * index - windowBuffer);
      windowDate.setMinutes(Math.floor(windowDate.getMinutes() / 10) * 10);
      windowDate.setSeconds(0);
      windowDate.setMilliseconds(0);
      const key = getFileNameForDate(windowDate);

      const isCurrentItem = status?.timestamp === key;

      const progressElement = !isCurrentItem ? null : (
        <Block>
          {(status.currentIndex + 1).toLocaleString()} of{" "}
          {status.total.toLocaleString()} events
        </Block>
      );

      return (
        <Block
          component="button"
          key={key}
          position="absolute"
          appearance="none"
          WebkitAppearance="none"
          border="none"
          backgroundColor="none"
          hoverBackgroundColor="none"
          width={tenMinutePx}
          borderBottom={status?.timestamp === key && "5px solid #888"}
          top={0}
          bottom={0}
          right={tenMinutePx * index}
          cursor="pointer"
          onClick={() => setTimestamp(windowDate.valueOf())}
        >
          {windowDate.toLocaleTimeString()}
          {progressElement}
        </Block>
      );
    }
  );

  return (
    <Block
      height={50}
      flex="0 0 auto"
      position="relative"
      props={{ ref: playheadContainerElementRef }}
    >
      {playheadElements}
    </Block>
  );
};
