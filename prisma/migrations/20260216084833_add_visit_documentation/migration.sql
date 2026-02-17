-- CreateTable
CREATE TABLE "VisitDocumentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "transcriptJson" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "soapNotes" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitDocumentation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitDocumentation_visitId_key" ON "VisitDocumentation"("visitId");

-- CreateIndex
CREATE INDEX "VisitDocumentation_visitId_idx" ON "VisitDocumentation"("visitId");
