import { createSchema, createYoga } from "graphql-yoga";
import { typeDefs } from "./schema";

const resolvers = {
  Query: {
    me: async (_: any, __: any, ctx: any) => {
      // Mocked for now, will integrate with actual loadSessionUser
      return { id: "123", login: "testuser", reputation: 100 };
    },
    repository: async (_: any, { owner, name }: { owner: string; name: string }) => {
      // Return mocked repository for now
      return {
        owner,
        name,
        verdicts: []
      };
    },
    topRepositories: async () => {
      return [];
    }
  },
  Mutation: {
    analyzeRepository: async (_: any, { owner, name }: { owner: string; name: string }) => {
      // Enqueue job logic would go here
      return {
        id: "job-123",
        status: "PENDING"
      };
    }
  }
};

export const schema = createSchema({
  typeDefs,
  resolvers
});

export const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response }
});
