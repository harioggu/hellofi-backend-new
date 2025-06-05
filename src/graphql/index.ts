import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { addressTypes } from "./address/userTypes";
import { addressResolvers } from "./address/userResolvers";
import { categoryResolvers } from "./category/resolvers";
import { readFileSync } from "fs";
import { join } from "path";

const categoryTypeDefs = readFileSync(
  join(__dirname, "category/schema.graphql"),
  "utf-8"
);

const typeDefs = [
  User.typeDefs,
  User.queries,
  User.mutations,
  addressTypes,
  categoryTypeDefs,
];

const resolvers = {
  Query: {
    ...User.resolvers.queries,
    ...addressResolvers.Query,
    ...categoryResolvers.Query,
  },
  Mutation: {
    ...User.resolvers.mutations,
    ...addressResolvers.Mutation,
    ...categoryResolvers.Mutation,
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
