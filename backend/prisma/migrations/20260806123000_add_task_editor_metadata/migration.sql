-- AlterTable
ALTER TABLE "tasks"
ADD COLUMN "lastEditedById" TEXT,
ADD COLUMN "lastEditedByName" TEXT,
ADD COLUMN "lastActionType" TEXT,
ADD COLUMN "lastActionAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_lastEditedById_idx" ON "tasks"("lastEditedById");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lastEditedById_fkey"
FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
