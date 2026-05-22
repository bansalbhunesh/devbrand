import { createFileRoute } from "@tanstack/react-router";
import { SlackBotHandler } from "../../../modules/notifications/slack-bot.server";

const slackBot = new SlackBotHandler();

export const Route = createFileRoute("/api/webhook/slack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await slackBot.handleSlackEvent(request);
        } catch (error) {
          console.error("Slack Webhook Error:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      }
    }
  }
});
