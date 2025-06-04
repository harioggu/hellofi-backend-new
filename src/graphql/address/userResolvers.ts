import { GraphQLError } from "graphql";
import AddressService from "../../services/Address";
import { prismaClient } from "../../lib/db";

export const addressResolvers = {
  Query: {
    addresses: async (_: any, __: any, context: any) => {
      // Get the first user from database for testing
      const testUser = await prismaClient.user.findFirst();
      if (!testUser) {
        throw new GraphQLError("No user found in database. Please create a user first.");
      }
      return AddressService.getAddresses(testUser.id);
    },

    address: async (_: any, { id }: { id: string }, context: any) => {
      // Get the first user from database for testing
      const testUser = await prismaClient.user.findFirst();
      if (!testUser) {
        throw new GraphQLError("No user found in database. Please create a user first.");
      }
      const address = await AddressService.getAddress(testUser.id, id);
      if (!address) {
        throw new GraphQLError("Address not found");
      }
      return address;
    }
  },

  Mutation: {
    createAddress: async (_: any, { input }: { input: any }, context: any) => {
      // Get the first user from database for testing
      const testUser = await prismaClient.user.findFirst();
      if (!testUser) {
        throw new GraphQLError("No user found in database. Please create a user first.");
      }
      return AddressService.createAddress(testUser.id, input);
    },

    updateAddress: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      // Get the first user from database for testing
      const testUser = await prismaClient.user.findFirst();
      if (!testUser) {
        throw new GraphQLError("No user found in database. Please create a user first.");
      }
      return AddressService.updateAddress(testUser.id, id, input);
    }
  }
}; 