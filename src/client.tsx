import { createStartClient } from "@tanstack/react-start/client";
import { createRouter } from "./router";
import { hydrateRoot } from "react-dom/client";

const router = createRouter();


const client = createStartClient({
  router,
});

hydrateRoot(document, <client.StartClient />);
