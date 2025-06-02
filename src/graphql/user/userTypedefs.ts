export const typeDefs = `
  enum Role {
    USER
    ADMIN
  }
    
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: Role!
    isEmailVerified: Boolean!
    isPhoneVerified: Boolean!
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthResponse {
    token: String
    user: User!
    refreshToken: String
    isNewUser: Boolean
  }

  type OtplessRateLimit {
    remaining: Int!
    total: Int!
    canAuthenticate: Boolean!
  }
`;
