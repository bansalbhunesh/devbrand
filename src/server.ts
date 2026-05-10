import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { getStartManifest as getRouterManifest } from "@tanstack/start-server-core/router-manifest";
import { createRouter } from "./router";

export default createStartHandler({
  createRouter,
  getRouterManifest,
  handler: defaultStreamHandler,
});
