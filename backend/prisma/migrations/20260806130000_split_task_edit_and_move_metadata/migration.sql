-- AlterTable
ALTER TABLE "tasks"
ADD COLUMN "lastEditedAt" TIMESTAMP(3),
ADD COLUMN "lastMovedById" TEXT,
ADD COLUMN "lastMovedByName" TEXT,
ADD COLUMN "lastMovedAt" TIMESTAMP(3);

-- Backfill move metadata from the previous combined action fields
UPDATE "tasks"
SET
  "lastMovedById" = CASE WHEN "lastActionType" = 'MOVED' THEN "lastEditedById" ELSE NULL END,
  "lastMovedByName" = CASE WHEN "lastActionType" = 'MOVED' THEN "lastEditedByName" ELSE NULL END,
  "lastMovedAt" = CASE WHEN "lastActionType" = 'MOVED' THEN "lastActionAt" ELSE NULL END,
  "lastEditedById" = CASE WHEN "lastActionType" = 'MOVED' THEN NULL ELSE "lastEditedById" END,
  "lastEditedByName" = CASE WHEN "lastActionType" = 'MOVED' THEN NULL ELSE "lastEditedByName" END,
  "lastEditedAt" = CASE WHEN "lastActionType" = 'MOVED' THEN NULL ELSE "lastActionAt" END
WHERE "lastActionType" IS NOT NULL;

UPDATE "tasks"
SET "lastEditedAt" = "lastActionAt"
WHERE "lastEditedAt" IS NULL AND "lastActionType" IN ('EDITED', 'CREATED');

-- CreateIndex
CREATE INDEX "tasks_lastMovedById_idx" ON "tasks"("lastMovedById");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lastMovedById_fkey"
FOREIGN KEY ("lastMovedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
