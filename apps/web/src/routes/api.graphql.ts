import { createFileRoute } from "@tanstack/react-router";
import { yoga } from "../graphql/server";

export const Route = createFileRoute("/api/graphql")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return yoga.handleRequest(request, {});
      },
      POST: async ({ request }) => {
        return yoga.handleRequest(request, {});
      }
    }
  }
});
