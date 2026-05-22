import { createFileRoute } from "@tanstack/react-router";
import { getLeaderboard } from "../../../modules/leaderboards/leaderboards.server";

export const Route = createFileRoute("/leaderboards")({
  loader: async () => {
    const leaders = await getLeaderboard({ data: { timeframe: "month" } });
    return { leaders };
  },
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
          <tbody>
            {leaders?.map((entry) => (
              <tr key={entry.username} className="border-b border-gray-800">
                <td className="p-4">{entry.rank}</td>
                <td className="p-4">
                  <a href={`/dev/${entry.username}`} className="text-blue-400 hover:underline">
                    {entry.username}
                  </a>
                </td>
                <td className="p-4 font-bold">{entry.egoScore}</td>
                <td className="p-4">{entry.reposAnalyzed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
