import { TwitterApi } from "twitter-api-v2";

// The accounts you want to monitor for breaking intel
const INTEL_ACCOUNTS = [
  "MarioNawfal",
  "spectatorindex",
  "BNONews",
  "unusual_whales",
  "disclosetv",
];

// Create a query like: "from:MarioNawfal OR from:BNONews -is:retweet"
const SEARCH_QUERY = `${INTEL_ACCOUNTS.map((handle) => `from:${handle}`).join(" OR ")} -is:retweet`;

export async function fetchOfficialXTweets() {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    console.warn("⚠️ X_BEARER_TOKEN missing. Skipping official X fetch.");
    return [];
  }

  try {
    // Initialize the official client (App-only auth is perfect for reading public tweets)
    const twitterClient = new TwitterApi(bearerToken);
    const roClient = twitterClient.readOnly;

    // Fetch the latest 10 tweets matching our high-intel accounts
    const response = await roClient.v2.search(SEARCH_QUERY, {
      "tweet.fields": ["created_at", "text", "author_id"],
      max_results: 10,
    });

    const tweets = response.data.data || [];

    // Map them to a clean format for our aggregator
    return tweets.map((tweet) => ({
      id: `x-${tweet.id}`,
      text: tweet.text,
      createdAt: new Date(tweet.created_at!), // Native JS Date
    }));
  } catch (error) {
    console.error("❌ Official X API Error:", error);
    return [];
  }
}
