import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  embedYouTubeLinksInHtml,
  getYouTubeId,
  youtubeThumbnailUrl,
} from "../lib/media/youtube";

const ID = "dQw4w9WgXcQ";

describe("getYouTubeId", () => {
  it("reads watch, share, shorts, and embed links", () => {
    assert.equal(getYouTubeId(`https://www.youtube.com/watch?v=${ID}`), ID);
    assert.equal(getYouTubeId(`https://youtu.be/${ID}`), ID);
    assert.equal(getYouTubeId(`https://www.youtube.com/shorts/${ID}`), ID);
    assert.equal(getYouTubeId(`https://www.youtube.com/embed/${ID}`), ID);
    assert.equal(getYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(getYouTubeId("not a url"), null);
  });
});

describe("embedYouTubeLinksInHtml", () => {
  it("replaces a lone YouTube link paragraph with a player", () => {
    const html = `<p><a href="https://www.youtube.com/watch?v=${ID}">https://www.youtube.com/watch?v=${ID}</a></p>`;
    const out = embedYouTubeLinksInHtml(html);
    assert.match(out, new RegExp(`youtube.com/embed/${ID}`));
    assert.doesNotMatch(out, /^<p>/);
  });

  it("leaves surrounding paragraphs alone", () => {
    const html = `<p>Watch this later.</p><p><a href="https://youtu.be/${ID}">video</a></p><p>More copy.</p>`;
    const out = embedYouTubeLinksInHtml(html);
    assert.match(out, /Watch this later/);
    assert.match(out, /More copy/);
    assert.match(out, new RegExp(`embed/${ID}`));
  });

  it("builds a thumbnail for cards", () => {
    assert.equal(
      youtubeThumbnailUrl(ID),
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    );
  });
});
