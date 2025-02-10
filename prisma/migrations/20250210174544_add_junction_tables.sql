-- Create junction table for Order-Category relationship
CREATE TABLE IF NOT EXISTS "_OrderCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_OrderCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OrderCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_OrderCategories_AB_unique" ON "_OrderCategories"("A", "B");
CREATE INDEX "_OrderCategories_B_index" ON "_OrderCategories"("B");

-- Create junction table for Order-Agency relationship
CREATE TABLE IF NOT EXISTS "_OrderAgencies" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_OrderAgencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OrderAgencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_OrderAgencies_AB_unique" ON "_OrderAgencies"("A", "B");
CREATE INDEX "_OrderAgencies_B_index" ON "_OrderAgencies"("B");