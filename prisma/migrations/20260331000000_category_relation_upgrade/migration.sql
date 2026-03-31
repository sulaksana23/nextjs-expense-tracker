CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "TransactionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_userId_slug_key" ON "Category"("userId", "slug");
CREATE INDEX "Category_userId_type_idx" ON "Category"("userId", "type");

INSERT INTO "Category" ("id", "name", "slug", "icon", "type", "createdAt", "updatedAt", "userId")
SELECT DISTINCT
    CONCAT('cat_', md5(CONCAT(normalized."userId", ':', normalized."slug"))),
    normalized."name",
    normalized."slug",
    normalized."icon",
    normalized."type",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    normalized."userId"
FROM (
    SELECT
        "userId",
        CASE
            WHEN lower("category") IN ('makan', 'kuliner', 'restaurant', 'resto', 'cafe', 'kopi') THEN 'Food'
            WHEN lower("category") IN ('gojek', 'grab', 'parkir', 'bensin') THEN 'Transport'
            WHEN lower("category") IN ('belanja', 'store', 'mart') THEN 'Shopping'
            WHEN lower("category") IN ('tagihan', 'listrik', 'air', 'internet') THEN 'Bills'
            WHEN lower("category") IN ('kesehatan', 'apotek', 'klinik') THEN 'Health'
            WHEN lower("category") IN ('hiburan', 'bioskop', 'game', 'netflix') THEN 'Entertainment'
            WHEN lower("category") IN ('gaji', 'payroll') THEN 'Salary'
            ELSE "category"
        END AS "name",
        CASE
            WHEN lower("category") IN ('makan', 'kuliner', 'restaurant', 'resto', 'cafe', 'kopi') THEN 'food'
            WHEN lower("category") IN ('gojek', 'grab', 'parkir', 'bensin') THEN 'transport'
            WHEN lower("category") IN ('belanja', 'store', 'mart') THEN 'shopping'
            WHEN lower("category") IN ('tagihan', 'listrik', 'air', 'internet') THEN 'bills'
            WHEN lower("category") IN ('kesehatan', 'apotek', 'klinik') THEN 'health'
            WHEN lower("category") IN ('hiburan', 'bioskop', 'game', 'netflix') THEN 'entertainment'
            WHEN lower("category") IN ('gaji', 'payroll') THEN 'salary'
            ELSE regexp_replace(lower("category"), '[^a-z0-9]+', '-', 'g')
        END AS "slug",
        CASE
            WHEN lower("category") IN ('food', 'makan', 'kuliner', 'restaurant', 'resto', 'cafe', 'kopi') THEN '🍔'
            WHEN lower("category") IN ('transport', 'gojek', 'grab', 'parkir', 'bensin') THEN '🛵'
            WHEN lower("category") IN ('shopping', 'belanja', 'store', 'mart') THEN '🛍️'
            WHEN lower("category") IN ('bills', 'tagihan', 'listrik', 'air', 'internet') THEN '💡'
            WHEN lower("category") IN ('health', 'kesehatan', 'apotek', 'klinik') THEN '💊'
            WHEN lower("category") IN ('entertainment', 'hiburan', 'bioskop', 'game', 'netflix') THEN '🎬'
            WHEN lower("category") IN ('education') THEN '📚'
            WHEN lower("category") IN ('travel') THEN '✈️'
            WHEN lower("category") IN ('salary', 'gaji', 'payroll') THEN '💼'
            WHEN lower("category") IN ('freelance') THEN '🧑‍💻'
            WHEN lower("category") IN ('bonus') THEN '🎁'
            WHEN lower("category") IN ('investment') THEN '📈'
            WHEN lower("category") IN ('business') THEN '🏪'
            WHEN lower("category") IN ('subscription') THEN '🔁'
            ELSE '🧾'
        END AS "icon",
        CASE
            WHEN lower("category") IN ('subscription', 'other') THEN NULL
            ELSE "type"
        END AS "type"
    FROM "Transaction"
) AS normalized;

ALTER TABLE "Transaction" ADD COLUMN "categoryId" TEXT;

UPDATE "Transaction" AS transaction_row
SET "categoryId" = category_row."id"
FROM "Category" AS category_row
WHERE category_row."userId" = transaction_row."userId"
  AND category_row."slug" = CASE
      WHEN lower(transaction_row."category") IN ('makan', 'kuliner', 'restaurant', 'resto', 'cafe', 'kopi') THEN 'food'
      WHEN lower(transaction_row."category") IN ('gojek', 'grab', 'parkir', 'bensin') THEN 'transport'
      WHEN lower(transaction_row."category") IN ('belanja', 'store', 'mart') THEN 'shopping'
      WHEN lower(transaction_row."category") IN ('tagihan', 'listrik', 'air', 'internet') THEN 'bills'
      WHEN lower(transaction_row."category") IN ('kesehatan', 'apotek', 'klinik') THEN 'health'
      WHEN lower(transaction_row."category") IN ('hiburan', 'bioskop', 'game', 'netflix') THEN 'entertainment'
      WHEN lower(transaction_row."category") IN ('gaji', 'payroll') THEN 'salary'
      ELSE regexp_replace(lower(transaction_row."category"), '[^a-z0-9]+', '-', 'g')
  END;

ALTER TABLE "Transaction" ALTER COLUMN "categoryId" SET NOT NULL;
DROP INDEX "Transaction_userId_category_idx";
ALTER TABLE "Transaction" DROP COLUMN "category";
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
