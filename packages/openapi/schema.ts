import { z } from "zod";
import { generateSchema } from "@anatine/zod-openapi";

export const webhookSchema = z.object({
  id: z.string(),
  event: z.string(),
  payload: z.record(z.any()),
});

export const OpenAPIDoc = {
  openapi: "3.1.0",
  info: {
    title: "DevBrand API",
    version: "1.0.0",
    description: "DevBrand REST API v1 for Engineering Intelligence",
  },
  paths: {
    "/webhooks/github": {
      post: {
        summary: "GitHub Webhook Receiver",
        description: "Receives pull_request events from GitHub Apps.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  pull_request: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "202": { description: "Webhook accepted and job enqueued" },
          "200": { description: "Webhook ignored or filtered" },
          "401": { description: "Invalid HMAC signature" },
        },
      },
    },
    "/api/v1/roast": {
      get: {
        summary: "Get Repo Roast",
        description: "Returns the generated roast for a specific repository.",
        parameters: [
          {
            name: "repoId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Successful response" },
        },
      },
    },
  },
};
