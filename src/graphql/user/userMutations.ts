export const mutations = `
  type Mutation {
    # Register a new user with OTPless
    registerUser(
      name: String!
      email: String!
      phone: String!
      password: String
    ): AuthResponse
    
    # Login with email/name and password (primarily for admin)
    loginUser(
      email: String
      name: String
      phone: String
      password: String!
    ): AuthResponse
    
    # Authenticate or register with OTPless
    authenticateWithOtpless(
      phone: String!
      email: String
      waId: String
    ): AuthResponse
    
    # Refresh authentication token
    refreshToken(refreshToken: String!): AuthResponse
    
    # Admin only: Create a new admin user
    createAdminUser(
      name: String!
      email: String!
      phone: String!
      password: String!
    ): User
  }
`;
