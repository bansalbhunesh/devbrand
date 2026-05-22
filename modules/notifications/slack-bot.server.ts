import { extractPRUrl } from "@devbrand/repo-intelligence";

export class SlackBotHandler {
  private readonly signingSecret = process.env.SLACK_SIGNING_SECRET || "";

  async handleSlackEvent(req: Request) {
    const signature = req.headers.get("X-Slack-Signature");
    const timestamp = req.headers.get("X-Slack-Request-Timestamp");

    if (!signature || !timestamp) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    const verified = await this.verifySlackSignature(body, signature, timestamp);

    if (!verified) return new Response("Unauthorized", { status: 401 });

    const event = JSON.parse(body);

    // Slack URL Verification Challenge
    if (event.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: event.challenge }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (event.event?.type === "message" && event.event.text?.includes("PR:")) {
      const prUrl = extractPRUrl(event.event.text);
      if (prUrl) {
        // Run analysis in background
        console.log(`[SlackBot] Triggering analysis for ${prUrl}`);
        // await enqueueAnalysis(prUrl, event.event.channel);
      }
    }

    return new Response("Processed", { status: 200 });
  }

  private async verifySlackSignature(body: string, signature: string, timestamp: string): Promise<boolean> {
    // Basic validation stub, proper HMAC implementation needed for production
    const time = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - time) > 300) {
      return false;
    }
    return true;
  }
}
