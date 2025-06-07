import { GraphQLError } from "graphql";
import AddressService from "../../services/Address";

export const addressResolvers = {
  Query: {
    addresses: async (_: any, __: any, context: any) => {
      // if (!context.user) {
      //   throw new GraphQLError("Not authenticated");
      // }
      return AddressService.getAddresses(context.user.id);
    },

    address: async (_: any, { id }: { id: string }, context: any) => {
      // if (!context.user) {
      //   throw new GraphQLError("Not authenticated");
      // }
      const address = await AddressService.getAddress(context.user.id, id);
      if (!address) {
        throw new GraphQLError("Address not found");
      }
      return address;
    }
  },

  Mutation: {
    createAddress: async (_: any, { input }: { input: any }, context: any) => {
      // if (!context.user) {
      //   throw new GraphQLError("Not authenticated");
      // }
      return AddressService.createAddress(context.user.id, input);
    },

    updateAddress: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      // if (!context.user) {
      //   throw new GraphQLError("Not authenticated");
      // }
      return AddressService.updateAddress(context.user.id, id, input);
    }
  }
}; 