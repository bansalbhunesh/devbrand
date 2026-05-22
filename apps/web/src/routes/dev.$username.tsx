import { createFileRoute } from "@tanstack/react-router";
import { db } from "@infrastructure/database/db.server";
import { users } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/dev/$username")({
  loader: async ({ params }) => {
    // Basic mock loader
    const { username } = params;
    return { username, egoScore: 850, badges: ["Early Adopter", "AI Detective"] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.username}'s Engineering Reputation | DevBrand` },
      { name: "description", content: `View ${loaderData?.username}'s architectural Ego Score and verified PR impacts.` },
      { property: "og:title", content: `${loaderData?.username}'s Engineering Reputation` },
      { property: "og:image", content: `https://devbrand.ai/api/og/user/${loaderData?.username}` },
    ],
  }),
  component: DeveloperProfile,
});

function DeveloperProfile() {
  const { username, egoScore, badges } = Route.useLoaderData();

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold">{username}</h1>
            <p className="text-xl text-gray-400 mt-2">Ego Score: <span className="text-white font-bold">{egoScore}</span></p>
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Badges</h2>
          <div className="flex gap-4">
            {badges.map(b => (
              <span key={b} className="px-4 py-2 bg-gray-800 rounded-full text-sm font-semibold border border-gray-700">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
