import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import createApolloGraphqlServer from "./graphql";
import UserService from "./services/User";
import cookieParser from "cookie-parser";
import cors from "cors";

async function init() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8000;

  // Add cookie parser middleware
  app.use(cookieParser());
  app.use(express.json());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    })
  );

  app.get("/", (req, res) => {
    res.json({ message: "Server is up and running" });
  });

  // Start Apollo server
  const apolloServer = await createApolloGraphqlServer();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        // Get token from cookies instead of headers
        let token = req.cookies?.accessToken;

        // If token is not found in cookies, try parsing the cookie header manually
        if (!token && req.headers.cookie) {
          const cookies = req.headers.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'accessToken') {
              token = value;
              break;
            }
          }
        }

        try {
          if (token) {
            const user = UserService.decodeJWTToken(token);
            return { user, req, res };
          }
        } catch (error: any) {
          console.log("Auth error:", error.message);
        }

        // Return request and response objects for cookie operations
        return { req, res };
      },
    }) as any
  );

  app.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));
}

init();
