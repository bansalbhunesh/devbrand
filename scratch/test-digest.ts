import { completeText, normalizeLlmJsonText } from "../packages/ai-sdk/llm.gateway";

const BAN_WORDS = /excited to|thrilled|game.?changer|journey|crushing it|🎉|🚀/i;
const WORD_COUNT = (s: string) => s.split(/\s+/).length;

const payload = {
  "week": "2026-05-15 to 2026-05-22",
  "buckets": [
    {
      "name": "Core Architecture",
      "totalScore": 120,
      "prs": [
        { "title": "Refactor Digest Generation to Structured Context Engine", "score": 85 },
        { "title": "Implement Drizzle Schema for PostOptions array", "score": 35 }
      ]
    },
    {
      "name": "Reliability & Infra",
      "totalScore": 65,
      "prs": [
        { "title": "Add Playwright E2E testing matrix", "score": 40 },
        { "title": "Setup Docker compose for local postgres and redis", "score": 25 }
      ]
    },
    {
      "name": "Product Features",
      "totalScore": 90,
      "prs": [
        { "title": "Build Minimalist 'What Mattered' Dashboard UI", "score": 45 },
        { "title": "Implement Streaming Rewrite for Shorter/More Technical", "score": 45 }
      ]
    }
  ],
  "alsoShipped": [
    "Update README with Confidence Software positioning",
    "Humanize internal cron weekly messaging"
  ]
};

function buildSystemPrompt(memoryBlock: string): string {
    return `You are a reflective, highly intelligent engineer writing a weekly work journal or builder update.

Given the strictly categorized and scored engineering events (buckets), what was the deeper technical story this week? Abstract the clusters into a cohesive narrative.

ANTI-CRINGE SYSTEM ACTIVATED:
You MUST actively remove fake hype.
You MUST remove generic AI language (e.g. "delve", "testament", "cutting-edge").
You MUST remove "🚀 shipped" or similar emojis.
You MUST remove engagement bait ("Thoughts?", "Agree?").
You MUST remove fake inspiration tone.

${memoryBlock}

Return STRICT JSON matching this schema:
{
  "postOptions": ["option 1: thoughtful narrative", "option 2: slightly more technical focus", "option 3: shorter, punchy work log"],
  "twitterThread": ["tweet1", "tweet2", "tweet3"],
  "releaseNotes": "markdown-formatted release notes with H2 section headers"
}

twitterThread rules:
- 3 to 7 tweets total. Hook -> Body -> Soft CTA. Max 270 chars each.
- Do NOT number the tweets.`;
}

async function runTest() {
  console.log("🚀 Starting Market Test Generation...\n");
  const memoryBlock = `No style history yet. Write in a measured, understated engineering voice. Short sentences. No superlatives.`;
  const systemPrompt = buildSystemPrompt(memoryBlock);
  const userMessage = `Here is the structured context payload for this week:\n\n${JSON.stringify(payload, null, 2)}`;

  try {
    const result = await completeText({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 3000,
      temperature: 0.7,
    });

    const parsed = JSON.parse(normalizeLlmJsonText(result.text));
    
    console.log("============= OPTION 1 (Narrative) =============");
    console.log(parsed.postOptions[0]);
    console.log("\n============= OPTION 2 (Technical) =============");
    console.log(parsed.postOptions[1]);
    console.log("\n============= OPTION 3 (Log) =============");
    console.log(parsed.postOptions[2]);
    console.log("\n============= TWITTER THREAD =============");
    console.log(parsed.twitterThread.join('\n\n'));
    console.log("\n============= VALIDATION =============");
    
    const testPost = parsed.postOptions[0] || "";
    if (BAN_WORDS.test(testPost)) {
        console.error("❌ FAILED BAN_WORDS GATE");
    } else {
        console.log("✅ PASSED BAN_WORDS");
    }
    console.log(`Word Count: ${WORD_COUNT(testPost)} (Ideal: 80-320)`);
    
  } catch (err) {
    console.error("Error running test:", err);
  }
}

runTest();
