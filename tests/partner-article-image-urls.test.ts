import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  articleImageUrls,
  isOurCloudinaryUrl,
} from "../lib/partner/article-image-urls";

const ORIGINAL =
  "https://res.cloudinary.com/dtoqunhcm/image/upload/v1/kindjoe/articles/storm.jpg";

describe("partner article image urls", () => {
  it("builds a wide hero and a square tile from one upload", () => {
    const urls = articleImageUrls(ORIGINAL);
    assert.equal(urls.originalUrl, ORIGINAL);
    assert.match(urls.coverImageUrl, /\/upload\/c_fill,g_auto,w_1600,h_900,f_auto,q_auto\//);
    assert.match(
      urls.postCard.imageUrl,
      /\/upload\/c_fill,g_auto,w_800,h_800,f_auto,q_auto\//,
    );
    assert.equal(urls.coverImageUrl.endsWith("/v1/kindjoe/articles/storm.jpg"), true);
  });

  it("recognizes this Cloudinary account", () => {
    assert.equal(isOurCloudinaryUrl(ORIGINAL, "dtoqunhcm"), true);
    assert.equal(
      isOurCloudinaryUrl("https://res.cloudinary.com/other/image/upload/v1/a.jpg", "dtoqunhcm"),
      false,
    );
    assert.equal(isOurCloudinaryUrl("http://example.com/a.jpg", "dtoqunhcm"), false);
  });
});
