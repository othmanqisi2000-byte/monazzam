/*
  Warnings:

  - You are about to drop the column `userId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_userId_fkey";

-- DropIndex
DROP INDEX "tasks_userId_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "userId";

-- DropTable
DROP TABLE "users";
