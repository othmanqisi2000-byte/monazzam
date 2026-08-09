CREATE TYPE "TaskType" AS ENUM ('STANDARD', 'OWNER_ASSIGNED');

ALTER TABLE "tasks"
ADD COLUMN "assigneeId" TEXT,
ADD COLUMN "taskType" "TaskType" NOT NULL DEFAULT 'STANDARD';

CREATE INDEX "tasks_workspaceId_taskType_assigneeId_status_order_idx"
ON "tasks"("workspaceId", "taskType", "assigneeId", "status", "order");

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
