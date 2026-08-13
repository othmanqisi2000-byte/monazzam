ALTER TABLE "tasks"
ADD COLUMN "assignmentGroupId" TEXT;

CREATE INDEX "tasks_workspaceId_assignmentGroupId_idx"
ON "tasks"("workspaceId", "assignmentGroupId");
