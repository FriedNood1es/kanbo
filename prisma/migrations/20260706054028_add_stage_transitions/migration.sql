-- CreateTable
CREATE TABLE "StageTransition" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStage" "ApplicationStage",
    "toStage" "ApplicationStage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageTransition_applicationId_createdAt_idx" ON "StageTransition"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
