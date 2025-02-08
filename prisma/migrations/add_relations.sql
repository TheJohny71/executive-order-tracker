-- Create Tag table
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) UNIQUE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Tag_name_idx" ON "Tag"("name");

-- Create Citation table
CREATE TABLE IF NOT EXISTS "Citation" (
    "id" SERIAL PRIMARY KEY,
    "sourceId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Citation_sourceId_targetId_key" UNIQUE ("sourceId", "targetId"),
    FOREIGN KEY ("sourceId") REFERENCES "Order"("id") ON DELETE CASCADE,
    FOREIGN KEY ("targetId") REFERENCES "Order"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Citation_sourceId_idx" ON "Citation"("sourceId");
CREATE INDEX IF NOT EXISTS "Citation_targetId_idx" ON "Citation"("targetId");

-- Create OrderTags junction table
CREATE TABLE IF NOT EXISTS "_OrderTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Order"("id") ON DELETE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE,
    UNIQUE ("A", "B")
);
CREATE INDEX IF NOT EXISTS "_OrderTags_A_idx" ON "_OrderTags"("A");
CREATE INDEX IF NOT EXISTS "_OrderTags_B_idx" ON "_OrderTags"("B");