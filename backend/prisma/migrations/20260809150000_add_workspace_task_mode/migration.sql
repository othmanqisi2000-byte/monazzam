CREATE TYPE "WorkspaceTaskMode" AS ENUM ('SHARED', 'OWNER_ASSIGNED_ONLY');

ALTER TABLE "workspaces"
ADD COLUMN "taskMode" "WorkspaceTaskMode" NOT NULL DEFAULT 'SHARED';
