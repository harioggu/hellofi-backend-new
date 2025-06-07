import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import createApolloGraphqlServer from "./graphql";
import UserService, { JWTPayload } from "./services/User";
import cookieParser from "cookie-parser";
import cors from "cors";
import { graphqlUploadExpress } from 'graphql-upload-minimal';

async function init() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8000;

  console.log("Server Init: Starting Express app setup.");

  // 1. General Request Logger (VERY early for debugging all requests)
  app.all('*', (req, res, next) => {
    console.log(`
--- Incoming Request ---
  Method: ${req.method}
  Path: ${req.path}
  Headers: ${JSON.stringify(req.headers, null, 2)}
  Cookies: ${JSON.stringify(req.cookies, null, 2)}
------------------------`);
    next();
  });

  // 2. Cookie Parser (required early to populate req.cookies)
  app.use(cookieParser());
  console.log("Server Init: Cookie parser middleware added.");

  // 3. Serve static files from the 'public' directory
  app.use(express.static('public'));
  console.log("Server Init: Static files middleware (public) added.");

  // 4. Configure CORS (GLOBAL - must be before body parsers for pre-flight OPTIONS requests)
  app.use(
    cors({
      origin: ["http://localhost:8000", "http://127.0.0.1:8000"],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-apollo-operation-name', 'apollo-require-preflight'], // Include Apollo-specific headers
    })
  );
  console.log("Server Init: CORS middleware added.");

  // 5. GraphQL File Upload middleware (GLOBAL - MUST be before express.json() for multipart uploads)
  app.use(graphqlUploadExpress());
  console.log("Server Init: GraphQL Upload middleware added.");

  // 6. Express JSON body parser (GLOBAL)
  app.use(express.json());
  console.log("Server Init: Express JSON middleware added.");

  // 7. Express URL-encoded body parser (GLOBAL - for traditional form submissions, if any)
  app.use(express.urlencoded({ extended: true }));
  console.log("Server Init: Express URL-encoded middleware added.");

  // 8. Simple GET route for server status check
  app.get("/", (req, res) => {
    console.log("Request: GET / received.");
    res.json({ message: "Server is up and running" });
  });

  console.log("Server Init: Creating Apollo GraphQL server...");
  // 9. Start Apollo server
  const apolloServer = await createApolloGraphqlServer();
  console.log("Server Init: Apollo GraphQL server created and started.");

  // Temporary test route for GraphQL endpoint check
  app.get("/graphql_test", (req, res) => {
    console.log("Request: GET /graphql_test received.");
    res.json({ message: "Test route for GraphQL" });
  });

  // 10. Apply Apollo Express middleware for GraphQL endpoint
  console.log("Server Init: Applying Apollo Express middleware to /graphql.");
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        console.log("Context: Request received for /graphql.");
        console.log("Context: req.cookies:", req.cookies);
        console.log("Context: req.headers.cookie:", req.headers.cookie);

        // Get token from cookies instead of headers
        let token = req.cookies?.accessToken;

        // If token is not found in cookies, try parsing the cookie header manually
        if (!token && req.headers.cookie) {
          console.log("Context: Access token not found in req.cookies, attempting manual parse.");
          const cookies = req.headers.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'accessToken') {
              token = value;
              console.log("Context: Access token found by manual parse.", token.substring(0, 10) + "...");
              break;
            }
          }
        }

        try {
          if (token) {
            console.log("Context: Token received in expressMiddleware context.", token.substring(0, 10) + "...");
            const decodedUser = UserService.decodeJWTToken(token) as JWTPayload | null;
            if (decodedUser && decodedUser.id) { // Ensure id exists after decoding
              console.log("Context: User decoded successfully:", decodedUser.id, decodedUser.email);
              return { user: decodedUser, req, res };
            } else {
              console.log("Context: UserService.decodeJWTToken returned null/undefined or invalid user for token.");
            }
          }
        } catch (error: any) {
          console.log("Auth error in context:", error.message);
        }

        // Return request and response objects for cookie operations
        console.log("Context: Returning context without user (token was not present or decoding failed).");
        return { req, res };
      },
    }) as any
  );

  app.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));
}

init().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
