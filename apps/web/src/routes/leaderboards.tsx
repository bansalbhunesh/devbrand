import { createFileRoute } from "@tanstack/react-router";
import { getLeaderboard } from "../../../modules/leaderboards/leaderboards.server";
import { motion } from "framer-motion";

export const Route = createFileRoute("/leaderboards")({
  loader: async () => {
    const leaders = await getLeaderboard({ data: { timeframe: "month" } });
    return { leaders };
  },
  head: () => ({
    meta: [
      { title: "Global Leaderboard | DevBrand" },
      { name: "description", content: "Top engineers ranked by their architectural Ego Score." },
      { property: "og:title", content: "Global Leaderboard | DevBrand" },
    ],
  }),
  component: LeaderboardsPage,
});

function LeaderboardsPage() {
  const { leaders } = Route.useLoaderData();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">🏆 Global Leaderboard</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left bg-gray-900 rounded-lg">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Developer</th>
              <th className="p-4">Ego Score</th>
              <th className="p-4">Verdicts</th>
            </tr>
          </thead>
          <motion.tbody
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
          >
            {leaders?.map((entry) => (
              <motion.tr
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 },
                }}
                key={entry.username}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                <td className="p-4">{entry.rank}</td>
                <td className="p-4">
                  <a href={`/dev/${entry.username}`} className="text-blue-400 hover:underline">
                    {entry.username}
                  </a>
                </td>
                <td className="p-4 font-bold">{entry.egoScore}</td>
                <td className="p-4">{entry.reposAnalyzed}</td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
