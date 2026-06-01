-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- atualiza a view para retornar apenas os clientes ativos (deletedAt = null)
DROP VIEW IF EXISTS "CustomerStats";

CREATE VIEW
  "CustomerStats" AS
SELECT
  c.id,
  c.name,
  c.phone,
  c."createdAt",
  COALESCE(SUM(s.total), 0) AS "totalSpent",
  (
    COALESCE(SUM(s.total), 0) - COALESCE(SUM(t.value), 0)
  ) as debt,
  MAX(s."purchasedAt") AS "lastPurchaseAt"
FROM
  "Customer" c
  LEFT JOIN "Sale" s on s."customerId" = c.id
  LEFT JOIN "CashFlowTransaction" t on t."saleId" = s.id
WHERE
  c."deletedAt" IS NULL
GROUP BY
  c.id,
  c.name;