import { createFileRoute } from "@tanstack/react-router";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getRepoRoast } from "../rpc";
import React from "react";

// Optional: you can load a font buffer here, but we will use a system font or 
// fetch a simple font to keep it light.
const fontUrl = "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff";

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const repo = url.searchParams.get("repo"); // owner/repo format
          const roastId = url.searchParams.get("id"); // specific roast id
          
          if (!repo && !roastId) {
            return new Response("Missing repo or roast id", { status: 400 });
          }

          let verdict = "This repository is a certified disaster area.";
          let aiSlopScore = 100;
          let ownerRepo = repo || "Unknown Repo";

          if (roastId) {
            try {
              // In production we'd inject the dependencies properly
              const roast = await getRepoRoast({ data: roastId });
              verdict = roast.roastData.verdict;
              aiSlopScore = roast.roastData.aiSlopScore;
              ownerRepo = `${roast.owner}/${roast.repo}`;
            } catch (e) {
              console.error("Failed to load roast for OG", e);
            }
          }

          const fontData = await fetch(fontUrl).then((res) => res.arrayBuffer());

          const svg = await satori(
            <div
              style={{
                display: "flex",
                height: "100%",
                width: "100%",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#000",
                color: "#fff",
                padding: "80px",
                fontFamily: "Inter",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 60,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  marginBottom: 40,
                  color: "#FF4444",
                }}
              >
                OBLITERATUS VERDICT
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  fontWeight: 700,
                  textAlign: "center",
                  marginBottom: 60,
                }}
              >
                {ownerRepo}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  fontWeight: 400,
                  textAlign: "center",
                  color: "#aaa",
                  lineHeight: 1.4,
                  maxWidth: 900,
                }}
              >
                "{verdict}"
              </div>
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  bottom: 40,
                  right: 40,
                  fontSize: 24,
                  fontWeight: 600,
                  color: aiSlopScore > 50 ? "#FF4444" : "#44FF44",
                }}
              >
                AI Slop: {aiSlopScore}%
              </div>
            </div>,
            {
              width: 1200,
              height: 630,
              fonts: [
                {
                  name: "Inter",
                  data: fontData,
                  weight: 400,
                  style: "normal",
                },
              ],
            }
          );

          const resvg = new Resvg(svg, {
            background: "#000",
            fitTo: {
              mode: "width",
              value: 1200,
            },
          });
          const pngData = resvg.render();
          const pngBuffer = pngData.asPng();

          return new Response(pngBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
            },
          });
        } catch (e) {
          console.error("OG Error:", e);
          return new Response("Failed to generate OG image", { status: 500 });
        }
      },
    },
  },
});
