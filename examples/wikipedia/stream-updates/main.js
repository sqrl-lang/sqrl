#!/usr/bin/env node
// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

var EventSource = require("eventsource");
var request = require("request-promise-native");
var jsdiff = require("diff");
var WtfWikipedia = require("wtf_wikipedia");
var diffMatchPatch = require("diff-match-patch-node")();

var DIFF_TIMEOUT = 60 * 1000; // 60s timeout

function diffAdded(r1, r2) {
  const rv = diffMatchPatch.diff_main(
    WtfWikipedia(r1).plaintext(),
    WtfWikipedia(r2).plaintext(),
    false, // no line-by-line optimization
    DIFF_TIMEOUT
  );
  return rv
    .filter(([direction, change]) => {
      return direction === 1;
    })
    .map(([direction, change]) => {
      return change.trim();
    })
    .join("\n");
}

var one = "beep boop";
var other = "beep boob blah";

var url = "https://stream.wikimedia.org/v2/stream/recentchange";

function usage(message) {
  console.error("Usage: wikipedia-json <wiki domain>");
  console.error("Example: wikipedia-json en.wikipedia.org");
  process.exit(1);
}

function main() {
  if (process.argv.length !== 3) {
    usage();
  }
  const domain = process.argv[2];
  if (!/^[a-z]+\.wikipedia\.org$/.exec(domain)) {
    usage();
  }

  startStream(domain);
}

async function fetchChangeContent(domain, revids, callback) {
  const body = await request.get(
    `https://${domain}/w/api.php?action=query&prop=revisions&rvslots=*&rvprop=content&format=json`,
    {
      json: true,
      qs: {
        revids: revids.join("|")
      }
    }
  );

  const [page] = Object.values(body.query.pages);
  return page.revisions.map(rev => rev.slots.main["*"]);
}

async function processEvent(domain, event) {
  const json = event.data;
  const data = JSON.parse(json);
  if (data.meta && data.meta.domain === domain && data.revision) {
    if (data.title.includes(":")) {
      // Ignore any changes to special pages (this is course but we're only sampling)
      return;
    }

    const [r1, r2] = await fetchChangeContent(domain, [
      data.revision.old,
      data.revision.new
    ]);

    const added = diffAdded(r1, r2);
    if (!added) {
      return;
    }

    console.log(
      JSON.stringify(
        Object.assign({}, data, {
          content: {
            added
          }
        })
      )
    );
  }
}

function startStream(domain) {
  console.error(`Connecting to EventStreams at ${url}`);
  var eventSource = new EventSource(url);

  eventSource.onopen = function(event) {
    console.error("-- Opened connection.");
  };

  eventSource.onerror = function(err) {
    console.error("-- Stream error: " + err.toString());
  };

  eventSource.onmessage = msg =>
    processEvent(domain, msg).catch(err => {
      console.error("-- Processing error: " + err.toString());
      console.error(err.stack);
    });
}

main();
