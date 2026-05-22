export const typeDefs = `
  type Query {
    me: User
    repository(owner: String!, name: String!): Repository
    topRepositories(limit: Int): [Repository!]!
  }

  type User {
    id: ID!
    login: String!
    reputation: Int!
  }

  type Repository {
    owner: String!
    name: String!
    verdicts: [Verdict!]!
  }

  type Verdict {
    id: ID!
    summary: String!
    aiSlopProbability: Float!
  }

  type Mutation {
    analyzeRepository(owner: String!, name: String!): AnalysisJob!
  }

  type AnalysisJob {
    id: ID!
    status: String!
  }
`;
