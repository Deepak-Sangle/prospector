-- CreateTable
CREATE TABLE "CompanyBrief" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT,
    "products" TEXT,
    "idealCustomer" TEXT,
    "competitors" TEXT,
    "notes" TEXT,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBrief_organizationId_key" ON "CompanyBrief"("organizationId");

-- AddForeignKey
ALTER TABLE "CompanyBrief" ADD CONSTRAINT "CompanyBrief_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
