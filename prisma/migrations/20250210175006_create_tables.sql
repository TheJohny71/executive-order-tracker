-- Create Status table
CREATE TABLE IF NOT EXISTS "Status" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL
);

-- Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL
);

-- Create Agency table
CREATE TABLE IF NOT EXISTS "Agency" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL
);

-- Create Order table
CREATE TABLE IF NOT EXISTS "Order" (
    "id" SERIAL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "number" TEXT UNIQUE,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "datePublished" TIMESTAMP NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "statusId" INTEGER REFERENCES "Status"("id")
);

-- Create junction tables
CREATE TABLE IF NOT EXISTS "_OrderCategories" (
    "A" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "B" INTEGER NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
    UNIQUE("A", "B")
);

CREATE TABLE IF NOT EXISTS "_OrderAgencies" (
    "A" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "B" INTEGER NOT NULL REFERENCES "Agency"("id") ON DELETE CASCADE,
    UNIQUE("A", "B")
);