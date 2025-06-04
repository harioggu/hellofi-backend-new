import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import { prismaClient } from "../lib/db";

const JWT_SECRET_USER = process.env.JWT_SECRET_USER || "$uperM@n@123";
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || "Adm!n$ecr3tK3y";

// Maximum OTPless attempts per day
const DAILY_OTP_LIMIT = 5;
// Bcrypt salt rounds
const SALT_ROUNDS = 10;

export interface CreateUserPayload {
  name: string;
  email: string;
  phone: string;
  password?: string; // Optional - users might register with OTPless only
}

export interface LoginUserPayload {
  email?: string;
  name?: string;
  phone?: string;
  password?: string; // Optional for OTPless login
}

export interface OtplessVerificationPayload {
  email?: string;
  phone: string; // Phone is required for OTPless
  name?: string; // Name from OTPless
}

class UserService {
  public static getUserById(id: string) {
    return prismaClient.user.findUnique({ where: { id } });
  }

  public static getUserByEmail(email: string) {
    return prismaClient.user.findUnique({ where: { email } });
  }

  private static getUserByPhone(phone: string) {
    return prismaClient.user.findUnique({ where: { phone } });
  }

  /**
   * Create a new user, either with password or with OTPless
   */
  public static async createUser(payload: CreateUserPayload) {
    const { name, email, phone, password } = payload;

    // Check if a user with this email or phone already exists
    const existingUser = await prismaClient.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new Error("User with this email or phone already exists");
    }

    // Data for user creation
    const userData: any = {
      name,
      email,
      phone,
      isPhoneVerified: true, // Phone is verified via OTPless
      isEmailVerified: false, // Email verification required for new users
    };

    // If password is provided (for admin), hash it with bcrypt
    if (password) {
      userData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // Create the user
    return prismaClient.user.create({
      data: userData,
    });
  }

  /**
   * Authenticate admin user with name/email and password
   */
  public static async getUserToken(payload: LoginUserPayload) {
    const { email, name, phone, password } = payload;

    if (!password) {
      throw new Error("Password is required for this login method");
    }

    let user;

    // Find user by email, name, or phone
    if (email) {
      user = await UserService.getUserByEmail(email);
    } else if (phone) {
      user = await UserService.getUserByPhone(phone);
    } else {
      throw new Error("Email or phone is required");
    }

    if (!user) throw new Error("User not found");
    if (!user.password) throw new Error("User doesn't have a password set");

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error("Account is temporarily locked. Please try again later.");
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Increment failed login attempts
      await prismaClient.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });

      // Lock account after 5 failed attempts
      const updatedUser = await prismaClient.user.findUnique({
        where: { id: user.id },
      });

      if (updatedUser && updatedUser.failedLoginAttempts >= 5) {
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + 30); // Lock for 30 minutes

        await prismaClient.user.update({
          where: { id: user.id },
          data: { lockedUntil: lockTime },
        });
      }

      throw new Error("Incorrect password");
    }

    // Reset failed attempts on successful login
    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    // Generate token based on user role
    const secret = user.role === "ADMIN" ? JWT_SECRET_ADMIN : JWT_SECRET_USER;
    const token = JWT.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      secret,
      { expiresIn: "7d" } // Updated to 15 days
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  /**
   * Track OTPless authentication attempt
   */
  private static async trackOtplessAttempt(params: {
    userId?: string;
    email?: string;
    phone: string;
    ip?: string;
    device?: string;
    successful: boolean;
  }) {
    const { userId, email, phone, ip, device, successful } = params;
    const today = new Date().toISOString().split("T")[0];

    await prismaClient.otplessAuthAttempt.create({
      data: {
        userId,
        email,
        phone,
        ip,
        device,
        requestDate: today,
        successful,
      },
    });
  }

  /**
   * Check if user has reached daily OTPless auth limit
   */
  public static async checkOtplessRateLimit(phone: string, ip?: string) {
    const today = new Date().toISOString().split("T")[0];

    // Count attempts by phone
    const attempts = await prismaClient.otplessAuthAttempt.count({
      where: {
        phone,
        requestDate: today,
      },
    });

    const remaining = Math.max(0, DAILY_OTP_LIMIT - attempts);

    return {
      remaining,
      total: DAILY_OTP_LIMIT,
      canAuthenticate: remaining > 0,
    };
  }

  /**
   * Authenticate or register a user with OTPless
   */
  public static async authenticateWithOtpless(
    payload: OtplessVerificationPayload,
    ip?: string,
    device?: string
  ) {
    const { email, phone, name } = payload;

    if (!phone) {
      throw new Error("Phone number is required for OTPless authentication");
    }

    // First check rate limits
    const rateLimit = await this.checkOtplessRateLimit(phone, ip);
    if (!rateLimit.canAuthenticate) {
      throw new Error(
        `Daily OTPless authentication limit reached (${DAILY_OTP_LIMIT}). Please try again tomorrow.`
      );
    }

    try {
      // Find existing user by phone
      let user = await UserService.getUserByPhone(phone);
      let isNewUser = false;

      // If user doesn't exist and we have an email, create a new account
      if (!user && email) {
        // Fix for TypeScript error - provide default name if undefined
        const userName =
          name ||
          (email
            ? email.split("@")[0]
            : `User_${Math.floor(Math.random() * 10000)}`);

        user = await UserService.createUser({
          name: userName,
          email,
          phone,
        });
        isNewUser = true;
      } else if (!user) {
        throw new Error(
          "User not found and email is required for registration"
        );
      }

      // Track successful attempt
      await this.trackOtplessAttempt({
        userId: user.id,
        email: user.email,
        phone,
        ip,
        device,
        successful: true,
      });

      // Update user information
      await prismaClient.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          lastLogin: new Date(),
        },
      });

      // Generate token based on user role
      const secret = user.role === "ADMIN" ? JWT_SECRET_ADMIN : JWT_SECRET_USER;
      const token = JWT.sign(
        { id: user.id, email: user.email, phone: user.phone, role: user.role },
        secret,
        { expiresIn: "15d" } // Updated to 15 days
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        isNewUser,
      };
    } catch (error) {
      // Track failed attempt
      await this.trackOtplessAttempt({
        phone,
        ip,
        device,
        successful: false,
      });
      throw error;
    }
  }

  /**
   * Generate a refresh token for a user
   */
  public static async generateRefreshToken(userId: string) {
    const user = await UserService.getUserById(userId);
    if (!user) throw new Error("User not found");

    const secret = user.role === "ADMIN" ? JWT_SECRET_ADMIN : JWT_SECRET_USER;
    const token = JWT.sign({ id: user.id, tokenType: "refresh" }, secret, {
      expiresIn: "15d", // Updated to 15 days
    });

    // Set expiration for 15 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15); // Updated to 15 days

    // Store refresh token in database
    await prismaClient.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Create admin user with bcrypt password (for direct database insertion)
   */
  public static async createAdminUser(
    name: string,
    email: string,
    phone: string,
    password: string
  ) {
    // Check if user already exists
    const existingUser = await prismaClient.user.findFirst({
      where: {
        OR: [{ email }, { phone }, { name }],
      },
    });

    if (existingUser) {
      throw new Error("Admin with this email, phone, or name already exists");
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin user
    return prismaClient.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "ADMIN",
        isEmailVerified: true,
        isPhoneVerified: true,
        active: true,
      },
    });
  }

  /**
   * Validate a JWT token
   */
  public static decodeJWTToken(token: string, isAdmin = false) {
    try {
      // Try with user secret first
      return JWT.verify(token, isAdmin ? JWT_SECRET_ADMIN : JWT_SECRET_USER);
    } catch (error) {
      // If user token verification fails and we're not checking specifically for admin
      if (!isAdmin) {
        // Try admin secret as fallback
        try {
          return JWT.verify(token, JWT_SECRET_ADMIN);
        } catch (adminError) {
          throw error; // Original error if both fail
        }
      }
      throw error;
    }
  }
}

export default UserService;
