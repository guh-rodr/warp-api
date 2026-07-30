-- This is an empty migration.
CREATE VIEW
  "ReceivableStats" AS
SELECT
  c.id as "customerId",
  c.name as "customerName",
  r.id,
  r.total,
  r.paid,
  r."saleId",
  r.description,
  EXISTS (
    SELECT
      1
    FROM
      "PaymentAllocation" pa
    WHERE
      pa."receivableId" = r.id
  ) AS "hasFinancialLog",
  r.status,
  r."occurredAt",
  r."dueAt"
FROM
  "Receivable" r
  LEFT JOIN "Customer" c ON c.id = r."customerId"