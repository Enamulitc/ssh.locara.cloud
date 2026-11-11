-- CreateTable
CREATE TABLE "CodeServerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostId" TEXT,
    "kubeClusterId" TEXT,
    "namespace" TEXT,
    "pod" TEXT,
    "container" TEXT,
    "remotePort" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeServerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeServerSession_userId_idx" ON "CodeServerSession"("userId");

-- CreateIndex
CREATE INDEX "CodeServerSession_hostId_idx" ON "CodeServerSession"("hostId");

-- CreateIndex
CREATE INDEX "CodeServerSession_kubeClusterId_idx" ON "CodeServerSession"("kubeClusterId");

-- AddForeignKey
ALTER TABLE "CodeServerSession" ADD CONSTRAINT "CodeServerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeServerSession" ADD CONSTRAINT "CodeServerSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeServerSession" ADD CONSTRAINT "CodeServerSession_kubeClusterId_fkey" FOREIGN KEY ("kubeClusterId") REFERENCES "KubeCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
