import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Use global variable in development to prevent multiple instances
const prismaClient = globalThis.__prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Add connection handling
prismaClient.$connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });

// Handle cleanup on app shutdown
process.on('beforeExit', async () => {
  await prismaClient.$disconnect();
  console.log('Disconnected from database');
});

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prismaClient;
}

export { prismaClient };
