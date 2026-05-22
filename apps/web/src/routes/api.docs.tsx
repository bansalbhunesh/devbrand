import { createFileRoute } from "@tanstack/react-router";
import { OpenAPIDoc } from "@devbrand/openapi/schema";

export const Route = createFileRoute("/api/docs")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(OpenAPIDoc), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
