// src/lib/aggregator/twitter.ts

const NEWS_HANDLES = ["spectatorindex", "disclosetv", "unusual_whales", "BNONews"];

export async function fetchLatestTweets() {
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST;

  const allTweets = [];

  for (const handle of NEWS_HANDLES) {
    try {
      // Using the 'user' endpoint to get the latest tweets from specific news accounts
      const url = `https://${host}/user-tweets?user=${handle}&count=5`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey!,
          'x-rapidapi-host': host!,
        }
      });

      const data = await response.json();
      
      // Navigate the Twitter API response structure
      const entries = data?.result?.timeline?.instructions?.[0]?.entries || [];

      for (const entry of entries) {
        const tweet = entry?.content?.itemContent?.tweet_results?.result?.legacy;
        const tweetId = entry?.entryId;

        if (tweet && tweet.full_text && !tweet.full_text.startsWith("RT @")) {
          allTweets.push({
            id: `x-${tweetId}`,
            text: tweet.full_text,
            source: 'X',
            handle: handle
          });
        }
      }
    } catch (error) {
      console.error(`Twitter Fetch Error (${handle}):`, error);
    }
  }

  return allTweets;
}