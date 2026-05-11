import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: any, ctx: any) {
    return handler(request, env, ctx);
  },
};
