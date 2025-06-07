import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { addressTypes } from "./address/types";
import { addressResolvers } from "./address/resolvers";
import { Upload } from "./upload";

const typeDefs = [
  User.typeDefs,
  User.queries,
  User.mutations,
  addressTypes,
  Upload.uploadTypes,
];

const resolvers = {
  Query: {
    ...User.resolvers.queries,
    ...addressResolvers.Query,
  },
  Mutation: {
    ...User.resolvers.mutations,
    ...addressResolvers.Mutation,
    ...Upload.uploadResolvers.Mutation,
  },
};

async function createApolloGraphqlServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // Enable introspection for Playground
    csrfPrevention: false, // Disable CSRF prevention for file uploads
  });

  // Start the gql server
  await server.start();

  return server;
}

export default createApolloGraphqlServer;
