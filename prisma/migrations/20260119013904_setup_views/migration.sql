DROP VIEW IF EXISTS "SaleStats";
DROP VIEW IF EXISTS "CustomerStats"; 
DROP VIEW IF EXISTS "CashFlowStats";

-- SaleStats
CREATE VIEW "SaleStats" AS
SELECT
  c.name as customerName,
  c.id as customerId,
  s.id,
  s.total,
  s.profit,
  s.purchasedAt,
  s.createdAt,
  COALESCE(i.itemCount, 0) AS itemCount,
  CASE
    WHEN COALESCE(p.totalPaid, 0) >= s.total THEN 'paid'
    ELSE 'pending'
  END AS status
FROM Sale s
LEFT JOIN Customer c ON s.customerId = c.id
LEFT JOIN (
  SELECT saleId, COUNT(*) AS itemCount
  FROM SaleItem
  GROUP BY saleId
) i ON i.saleId = s.id
LEFT JOIN (
  SELECT saleId, SUM(value) AS totalPaid
  FROM CashFlowTransaction
  GROUP BY saleId
) p ON p.saleId = s.id;


-- CustomerStats
CREATE VIEW "CustomerStats" AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.createdAt,
  COALESCE(SUM(s.total), 0) AS totalSpent,
  (COALESCE(SUM(s.total), 0) - COALESCE(SUM(t.value), 0)) as debt,
  MAX(s.purchasedAt) AS lastPurchaseAt
FROM Customer c
LEFT JOIN Sale s on s.customerId = c.id
LEFT JOIN CashFlowTransaction t on t.saleId = s.id
GROUP BY c.id, c.name;

-- CashFlowStats
CREATE VIEW "CashFlowStats" AS
SELECT
  t.id,
  t.description,
  t.category,
  t.value,
  t.flow,
  t.date,
  t.createdAt,
  s.id as saleId
FROM CashFlowTransaction t
LEFT JOIN Sale s ON s.id = t.saleId;