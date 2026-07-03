import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import { isProvidedContentInput } from "@/lib/ai/source-first-research";
import { processSourceFirstArticleJob, createSourceFirstArticleJob } from "@/lib/agents/source-first-article-jobs";

const pasted = `Community Fundraiser at Ventura Harbor

Last Saturday, local organizers held a fundraiser for the Ventura Harbor youth sailing program.
About 120 people attended. The event raised $8,400 according to organizer Maria Chen.

The program teaches middle school students basic sailing skills and water safety.
City council member James Ortiz spoke briefly and praised the volunteers.

Organizers said they still need $2,000 more before the spring session starts on April 12.
They plan another bake sale on March 15 at Harbor Village.

Several parents said the program helped their kids build confidence on the water.
One parent, Denise Ramos, said her daughter now wants to join the high school sailing team.

The harbor authority confirmed the program can use the dock space through June.
They have not announced whether funding will continue next year.`;

async function main() {
  console.log("isProvidedContentInput:", isProvidedContentInput(pasted));
  const job = await createSourceFirstArticleJob({ topic: pasted });
  const result = await processSourceFirstArticleJob(job);
  console.log("mode:", result.sourceFirst.generationMode);
  console.log("words:", result.draftMarkdown.split(/\s+/).length);
  console.log("title:", result.title);
  console.log("preview:", result.draftMarkdown.slice(0, 400));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
