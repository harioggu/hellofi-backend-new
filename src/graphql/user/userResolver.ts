import UserService, {
  CreateUserPayload,
  LoginUserPayload,
  OtplessVerificationPayload,
} from "../../services/User";
import JWT from "jsonwebtoken";

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
    throw new Error("Not authenticated");
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
    try {
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
    } catch (error: any) {
      throw new Error(error.message || "Failed to register user");
    }
  },

  // Login admin user with name/email and password
  loginUser: async (_: any, payload: LoginUserPayload, context: any) => {
    try {
      // Ensure there's a password for this login method
      if (!payload.password) {
        throw new Error("Password is required for this login method");
      }

      const authResponse = await UserService.getUserToken(payload);

      // Generate refresh token
      const refreshToken = await UserService.generateRefreshToken(
        authResponse.user.id
      );

      // Set access token in HTTP-only cookie in the resolver
      context.res.cookie("accessToken", authResponse.token, {
        httpOnly: true,
        secure: false, // Set to false for local HTTP development
        sameSite: 'Lax', // 'Lax' is generally better for same-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      console.log("Login Resolver: Access token cookie set on response with secure: false, sameSite: Lax.");

      return {
        ...authResponse,
        refreshToken,
        isNewUser: false,
      };
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  },

  // Authenticate with OTPless
  authenticateWithOtpless: async (
    _: any,
    payload: OtplessVerificationPayload,
    context: any
  ) => {
    try {
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
    } catch (error: any) {
      throw new Error(error.message || "OTPless authentication failed");
    }
  },

  // Refresh authentication token
  refreshToken: async (
    _: any,
    { refreshToken }: { refreshToken: string },
    context: any
  ) => {
    try {
      // Verify refresh token
      const decoded = UserService.decodeJWTToken(refreshToken) as JWTPayload;

      // Now we can safely access the id property
      if (!decoded || !decoded.id) {
        throw new Error("Invalid token format");
      }

      const userId = decoded.id;

      // Get user
      const user = await UserService.getUserById(userId);
      if (!user) throw new Error("User not found");

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
    } catch (error: any) {
      throw new Error(error.message || "Invalid or expired refresh token");
    }
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
    try {
      // Check if the requester is already an admin (for security)
      if (context.user?.role !== "ADMIN") {
        throw new Error("Only existing admins can create new admin users");
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
    } catch (error: any) {
      throw new Error(error.message || "Failed to create admin user");
    }
  },
};

export const resolvers = { queries, mutations };
