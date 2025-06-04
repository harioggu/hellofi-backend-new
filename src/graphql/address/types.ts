import { gql } from "graphql-tag";

export const addressTypes = gql`
  type Address {
    id: ID!
    userId: String!
    name: String!
    contact: String!
    alternateContactNo: String
    email: String!
    address: String!
    pinCode: String!
    landMark: String
    cityDistrict: String!
    state: String!
    gst: String
    addressType: AddressType!
    isDefault: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  enum AddressType {
    HOME
    WORK
    OTHER
  }

  input CreateAddressInput {
    name: String!
    contact: String!
    alternateContactNo: String
    email: String!
    address: String!
    pinCode: String!
    landMark: String
    cityDistrict: String!
    state: String!
    gst: String
    addressType: AddressType!
    isDefault: Boolean
  }

  input UpdateAddressInput {
    name: String
    contact: String
    alternateContactNo: String
    email: String
    address: String
    pinCode: String
    landMark: String
    cityDistrict: String
    state: String
    gst: String
    addressType: AddressType
    isDefault: Boolean
  }

  type Query {
    addresses: [Address!]!
    address(id: ID!): Address
  }

  type Mutation {
    createAddress(input: CreateAddressInput!): Address!
    updateAddress(id: ID!, input: UpdateAddressInput!): Address!
  }
`; 