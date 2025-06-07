import UserService, {
  CreateUserPayload,
  LoginUserPayload,
  OtplessVerificationPayload,
} from "../../services/User";
import JWT from "jsonwebtoken";
import { GraphQLError } from "graphql";

// Import JWT secrets to fix reference error
const JWT_SECRET_USER = process.env.JWT_SECRET_USER || "$uperM@n@123";
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || "Adm!n$ecr3tK3y";

// Define interface for JWT payload to fix type error
interface JWTPayload {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  tokenType?: string;
  iat?: number;
  exp?: number;
}

const queries = {
  // Get current user from JWT token
  me: async (_: any, __: any, context: any) => {
    if (context && context.user) {
      const userId = context.user.id;
      const user = await UserService.getUserById(userId);
      return user;
    }
    throw new GraphQLError("Not authenticated");
  },

  // Check OTPless rate limits
  checkOtplessRateLimit: async (
    _: any,
    { phone }: { phone: string },
    context: any
  ) => {
    const rateLimit = await UserService.checkOtplessRateLimit(phone);
    return rateLimit;
  },
};

const mutations = {
  // Register a new user (OTPless users are auto-registered)
  registerUser: async (_: any, payload: CreateUserPayload, context: any) => {
    const user = await UserService.createUser(payload);

    // For users with password, generate auth tokens
    let authResponse = null;
    let refreshToken = null;

    if (payload.password) {
      authResponse = await UserService.getUserToken({
        email: user.email,
        password: payload.password,
      });

      refreshToken = await UserService.generateRefreshToken(user.id);
    }

    return {
      token: authResponse?.token || null,
      user: authResponse?.user || user,
      refreshToken,
      isNewUser: true,
    };
  },

  // Login admin user with name/email and password
  loginUser: async (_: any, payload: LoginUserPayload, context: any) => {
    // Ensure there's a password for this login method
    if (!payload.password) {
      throw new GraphQLError("Password is required for this login method");
    }

    const authResponse = await UserService.getUserToken(payload);

    // Generate refresh token
    const refreshToken = await UserService.generateRefreshToken(
      authResponse.user.id
    );

    return {
      ...authResponse,
      refreshToken,
      isNewUser: false,
    };
  },

  // Authenticate with OTPless
  authenticateWithOtpless: async (
    _: any,
    payload: OtplessVerificationPayload,
    context: any
  ) => {
    // Get IP from context if available
    const ip = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.headers["user-agent"];

    const authResponse = await UserService.authenticateWithOtpless(
      payload,
      ip,
      userAgent
    );

    // Generate refresh token
    const refreshToken = await UserService.generateRefreshToken(
      authResponse.user.id
    );

    return {
      ...authResponse,
      refreshToken,
    };
  },

  // Refresh authentication token
  refreshToken: async (
    _: any,
    { refreshToken }: { refreshToken: string },
    context: any
  ) => {
    // Verify refresh token
    const decoded = UserService.decodeJWTToken(refreshToken) as JWTPayload;

    // Now we can safely access the id property
    if (!decoded || !decoded.id) {
      throw new GraphQLError("Invalid token format");
    }

    const userId = decoded.id;

    // Get user
    const user = await UserService.getUserById(userId);
    if (!user) throw new GraphQLError("User not found");

    // Generate new token with proper JWT import
    const secret = user.role === "ADMIN" ? JWT_SECRET_ADMIN : JWT_SECRET_USER;

    const token = JWT.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      secret,
      { expiresIn: "15d" }
    );

    // Generate new refresh token
    const newRefreshToken = await UserService.generateRefreshToken(user.id);

    return {
      token,
      user,
      refreshToken: newRefreshToken,
      isNewUser: false,
    };
  },

  // Create admin user (direct database insertion, typically used in scripts)
  createAdminUser: async (
    _: any,
    {
      name,
      email,
      phone,
      password,
    }: { name: string; email: string; phone: string; password: string },
    context: any
  ) => {
    // Check if the requester is already an admin (for security)
    if (context.user?.role !== "ADMIN") {
      throw new GraphQLError("Only existing admins can create new admin users");
    }

    const adminUser = await UserService.createAdminUser(
      name,
      email,
      phone,
      password
    );

    return {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: adminUser.role,
    };
  },
};

export const resolvers = { queries, mutations };
