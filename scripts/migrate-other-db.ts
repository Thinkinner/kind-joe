import "dotenv/config";
import { db } from "../db/index";
import { articles } from "../db/schema";
import { universalParser } from "../lib/content/parser";
import { eq, isNull } from "drizzle-orm";

async function main() {
  console.log("🚀 Starting migration: JSONB/HTML to Markdown...");

  try {
    // 1. Fetch all articles where Markdown is missing
    const rows = await db.select().from(articles).where(isNull(articles.contentMarkdown));
    
    console.log(`Found ${rows.length} articles to convert...`);

    let successCount = 0;
    for (const row of rows) {
      try {
        // 2. Convert the old JSONB content (or HTML) to Markdown
        // We prefer 'content' (JSONB) as it's more structured, but fallback to contentHtml
        const sourceData = row.content || row.contentHtml;
        
        if (!sourceData) {
          console.log(`⚠️ Skipping "${row.title}" (No source data found)`);
          continue;
        }

        const markdown = universalParser(sourceData);

        if (markdown) {
          // 3. Update the row with the new Markdown string
          await db.update(articles)
            .set({ contentMarkdown: markdown })
            .where(eq(articles.id, row.id));
          
          successCount++;
          console.log(`✅ [${successCount}/${rows.length}] Converted: ${row.title}`);
        }
      } catch (err) {
        console.error(`❌ Failed to convert article: ${row.title} (ID: ${row.id})`, err);
      }
    }

    console.log(`\n✅ Migration complete! ${successCount} articles updated.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
