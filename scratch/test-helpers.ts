function enforceMinimalist(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length <= 2) return text;
  const withMetric = sentences.find(s => /\d+%|\d+ms|\d+x/.test(s));
  const result = [sentences[0].trim(), (withMetric ?? sentences[1]).trim()].join(" ").trim();
  return result;
}

function styleDriftScore(current: string, pastDigests: string[]): number {
  if (pastDigests.length === 0) return 0;
  const avgSentenceLength = (text: string) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
    return sentences.reduce((s, x) => s + x.trim().split(/\s+/).length, 0) / (sentences.length || 1);
  };
  const pastAvg = pastDigests.reduce((s, d) => s + avgSentenceLength(d), 0) / pastDigests.length;
  const currentAvg = avgSentenceLength(current);
  return Math.abs(currentAvg - pastAvg);
}

console.log("=== Testing enforceMinimalist ===");
const input1 = "We overhauled the caching architecture this week to reduce database pressure. We moved session data from Postgres to Redis. API latency dropped by 40%. We are thrilled to see these results. This sets us up for scale.";
console.log("Input:", input1);
console.log("Output:", enforceMinimalist(input1));
// Expected: We overhauled the caching architecture this week to reduce database pressure. API latency dropped by 40%.

console.log("\n=== Testing styleDriftScore ===");
const past = [
  "Fixed the worker queue race condition. Dropped 500s to zero.", // 6 + 5 = 11 words, 2 sentences, avg 5.5
  "Migrated auth to JWTs. Removed stateful sessions." // 4 + 3 = 7 words, 2 sentences, avg 3.5
]; // overall past avg ~ 4.5
const currentGood = "Added cross-sprint deduplication. Reduced DB calls."; // 4 + 3 = 7 words, 2 sentences, avg 3.5 -> drift 1.0
const currentBad = "We are incredibly excited to announce that we have completely reimagined the entire backend pipeline architecture from the ground up! This will empower users to achieve synergies!"; // 19 + 8 = 27 words, 2 sentences, avg 13.5 -> drift ~9
console.log("Good drift:", styleDriftScore(currentGood, past).toFixed(2));
console.log("Bad drift:", styleDriftScore(currentBad, past).toFixed(2));
