import { PrismaClient, Address, AddressType } from "@prisma/client";
import { GraphQLError } from "graphql";

const prisma = new PrismaClient();

class AddressService {
  async createAddress(userId: string, input: {
    name: string;
    contact: string;
    alternateContactNo?: string;
    email: string;
    address: string;
    pinCode: string;
    landMark?: string;
    cityDistrict: string;
    state: string;
    gst?: string;
    addressType: AddressType;
    isDefault?: boolean;
  }): Promise<Address> {
    // If this is set as default, unset any existing default address
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    return prisma.address.create({
      data: {
        ...input,
        userId
      }
    });
  }

  async updateAddress(userId: string, addressId: string, input: {
    name?: string;
    contact?: string;
    alternateContactNo?: string;
    email?: string;
    address?: string;
    pinCode?: string;
    landMark?: string;
    cityDistrict?: string;
    state?: string;
    gst?: string;
    addressType?: AddressType;
    isDefault?: boolean;
  }): Promise<Address> {
    // Verify address belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      throw new GraphQLError("Address not found or unauthorized");
    }

    // If setting as default, unset any existing default address
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false }
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data: input
    });
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });
  }

  async getAddress(userId: string, addressId: string): Promise<Address | null> {
    return prisma.address.findFirst({
      where: { id: addressId, userId }
    });
  }
}

export default new AddressService(); 