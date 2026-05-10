import { createStartHandler } from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import { createRouter } from "./router";

const router = createRouter();

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(({ request }) => {
  return {
    router,
  };
});
