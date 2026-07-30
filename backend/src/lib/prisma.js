const { PrismaClient } = require('@prisma/client');

// Prevent multiple PrismaClient instances in dev (hot-reload) from exhausting
// the Neon connection pool.
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
