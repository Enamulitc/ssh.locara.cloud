-- CreateEnum
CREATE TYPE "KubeCredentialType" AS ENUM ('KUBECONFIG');

-- CreateTable
CREATE TABLE "KubeCluster" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "ownerTeamId" TEXT,
    "name" TEXT NOT NULL,
    "defaultNamespace" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "folder" TEXT,
    "color" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KubeCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KubeCredential" (
    "id" TEXT NOT NULL,
    "kubeClusterId" TEXT NOT NULL,
    "type" "KubeCredentialType" NOT NULL DEFAULT 'KUBECONFIG',
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KubeCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KubeCluster_ownerUserId_idx" ON "KubeCluster"("ownerUserId");

-- CreateIndex
CREATE INDEX "KubeCluster_ownerTeamId_idx" ON "KubeCluster"("ownerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "KubeCredential_kubeClusterId_key" ON "KubeCredential"("kubeClusterId");

-- AddForeignKey
ALTER TABLE "KubeCluster" ADD CONSTRAINT "KubeCluster_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KubeCluster" ADD CONSTRAINT "KubeCluster_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KubeCredential" ADD CONSTRAINT "KubeCredential_kubeClusterId_fkey" FOREIGN KEY ("kubeClusterId") REFERENCES "KubeCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
