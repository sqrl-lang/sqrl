// Copyright 2019 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const cheerio = require("cheerio");
const emojis = require("../github_emojis");
const util = require("hexo-util");

function replaceEmojis(content) {
  return content.replace(/:([a-z_]+):/g, (match, emoji) => {
    if (!emojis[emoji]) {
      return match;
    }
    return `<img class="emoji" src="${util.escapeHTML(
      emojis[emoji]
    )}" title="${util.escapeHTML(match)}" />`;
  });
}

hexo.extend.filter.register("after_post_render", (data) => {
  const $ = cheerio.load(data.content);

  function recurse(node) {
    for (const child of node.children || []) {
      if (child.type === "text") {
        const content = replaceEmojis(child.data);

        // If we replace a text child, make sure that we scan this node again for more emojis
        if (content !== child.data) {
          $(child).replaceWith($.parseHTML(content));
          return recurse(node);
        }
      } else if (
        child.type === "tag" &&
        child.name !== "pre" &&
        child.name !== "code"
      ) {
        recurse(child);
      }
    }
  }

  Array.from($.root().children()).forEach((child) => recurse(child));

  data.content = $.root().html();

  return data;
});
