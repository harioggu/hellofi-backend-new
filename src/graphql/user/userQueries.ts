export const queries = `
  # Get currently logged in user based on JWT token
  me: User
  
  # Check OTPless daily rate limit for a phone number
  checkOtplessRateLimit(phone: String!): OtplessRateLimit
`;
