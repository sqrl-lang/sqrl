import type { NextApiRequest, NextApiResponse } from "next";
import { getFileNameForDate } from "../../../src/getFileNameForDate";
import { invariant } from "../../../src/invariant";

const getSampleData = (date: Date) => {
  const datePlusSeconds = (seconds: number) => {
    const newDate = new Date(date);
    newDate.setSeconds(newDate.getSeconds() + seconds);
    return newDate.toISOString();
  };

  const timestampString = getFileNameForDate(date);

  return {
    v: 0,
    timestamp: timestampString,
    events: [
      {
        v: 1,
        eventName: "create-follow",
        timestamp: datePlusSeconds(0),
        payload: {
          record: {
            $type: "app.bsky.graph.follow",
            subject: "did:plc:uuuuuuuuuuuuuuu",
            createdAt: datePlusSeconds(0),
          },
          uri: "at://did:plc:aaaaaaaaa/app.bsky.graph.follow/bbbbbbbbbb",
          cid: "cccccccccccccc",
          author: "did:plc:aaaaaaaaa",
        },
        resolvedDids: {
          "did:plc:aaaaaaaaa": "example1.bsky.social",
        },
      },
      {
        v: 1,
        eventName: "create-like",
        timestamp: datePlusSeconds(5),
        payload: {
          record: {
            $type: "app.bsky.feed.like",
            subject: {
              cid: "dddddddddddddd",
              uri: "at://did:plc:eeeeeeeeeeeee/app.bsky.feed.post/hhhhhhhhhhhhh",
            },
            createdAt: datePlusSeconds(5),
          },
          uri: "at://did:plc:iiiiiiiiiiiiiiiiii/app.bsky.feed.like/jjjjjjjjjjjjjjjjj",
          cid: "kkkkkkkkkkkkkkkkk",
          author: "did:plc:iiiiiiiiiiiiiiiiii",
        },
        resolvedDids: {
          "did:plc:eeeeeeeeeeeee": "example2.bsky.social",
          "did:plc:iiiiiiiiiiiiiiiiii": "example3.bsky.social",
        },
      },
      {
        v: 1,
        eventName: "create-post",
        timestamp: datePlusSeconds(10),
        payload: {
          record: {
            text: "The text of your post " + timestampString,
            $type: "app.bsky.feed.post",
            reply: {
              root: {
                cid: "llllllllllllllllllll",
                uri: "at://did:plc:mmmmmmmmmmmmmmmmm/app.bsky.feed.post/nnnnnnnnnnnnn",
              },
              parent: {
                cid: "llllllllllllllllllll",
                uri: "at://did:plc:mmmmmmmmmmmmmmmmm/app.bsky.feed.post/nnnnnnnnnnnnn",
              },
            },
            createdAt: datePlusSeconds(10),
          },
          uri: "at://did:plc:oooooooooooooooooo/app.bsky.feed.post/ppppppppppppppppp",
          cid: "qqqqqqqqqqqqqqqqqqqqqqq",
          author: "did:plc:oooooooooooooooooo",
        },
        resolvedDids: { "did:plc:oooooooooooooooooo": "example4.bsky.social" },
      },
      {
        v: 1,
        eventName: "delete-like",
        timestamp: datePlusSeconds(15),
        payload: {
          uri: "at://did:plc:rrrrrrrrrrrrrrrrrrrrr/app.bsky.feed.like/ssssssssssssssss",
        },
        resolvedDids: {
          "did:plc:rrrrrrrrrrrrrrrrrrrrr": "example5.bsky.social",
        },
      },
    ],
  };
};

export default function blueskyMockApiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!process.env.BLUESKY_MOCK_API) {
    return res.status(404);
  }

  const { jsonFilename } = req.query;
  invariant(typeof jsonFilename === "string", "Expected a string");
  invariant(
    jsonFilename.endsWith(".json"),
    "Expected a path ending in `.json`"
  );
  const thing = jsonFilename.slice(0, -".json".length);
  const date = new Date(thing + "0:00.000Z");
  const latestDate = new Date();
  latestDate.setMinutes(latestDate.getMinutes() - 11);

  console.log("Fetch data for %o (%s)", date, date.toLocaleString());

  // simulate prod data delay
  if (date > latestDate)
    return res.status(404).send("The requested date is too far in the future");

  res.json(getSampleData(date));
}
