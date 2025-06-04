import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { addressTypes } from "./address/types";
import { addressResolvers } from "./address/resolvers";

const typeDefs = [
  User.typeDefs,
  User.queries,
  User.mutations,
  addressTypes,
];

const resolvers = {
  Query: {
    ...User.resolvers.queries,
    ...addressResolvers.Query,
  },
  Mutation: {
    ...User.resolvers.mutations,
    ...addressResolvers.Mutation,
  },
};

async function createApolloGraphqlServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Start the gql server
  await server.start();

  return server;
}

export default createApolloGraphqlServer;
