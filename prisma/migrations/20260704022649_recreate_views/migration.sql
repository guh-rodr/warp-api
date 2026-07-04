-- VENDA
CREATE VIEW "SaleStats" AS
  SELECT
    s.id,
    s.total,
    s.profit,
    COALESCE(item_agg.count, 0) AS "itemCount",
    s."purchasedAt",
    CASE
      WHEN COALESCE(receivable_agg.paid, 0) = 0 THEN 'PENDING'
      WHEN receivable_agg.paid >= s.total THEN 'PAID'
      ELSE 'PARTIAL'
    END AS status,
    c.id AS "customerId",
    c.name AS "customerName"
  FROM "Sale" s
  LEFT JOIN "Customer" c ON c.id = s."customerId"
  LEFT JOIN (
    SELECT "saleId", SUM(paid) AS paid
    FROM "Receivable"
    WHERE "saleId" IS NOT NULL
    GROUP BY "saleId"
  ) receivable_agg ON receivable_agg."saleId" = s.id
  LEFT JOIN (
    SELECT "saleId", COUNT(*) AS count
    FROM "SaleItem"
    WHERE "saleId" IS NOT NULL
    GROUP BY "saleId"
  ) item_agg ON item_agg."saleId" = s.id;



-- CLIENTE
CREATE OR REPLACE VIEW "CustomerStats" AS
  SELECT
    c.id,
    c.name,
    c.phone,
    c."createdAt",
    COALESCE(receivable_agg.total_spent, 0)::bigint AS "totalSpent",
    COALESCE(receivable_agg.debt, 0)::bigint AS debt,
    sale_agg.last_purchase_at AS "lastPurchaseAt"
  FROM "Customer" c
  LEFT JOIN (
    SELECT
      "customerId",
      SUM(CASE WHEN status IN ('PARTIAL', 'PAID') THEN paid ELSE 0 END) AS total_spent,
      SUM(total) - SUM(paid) AS debt
    FROM "Receivable"
    WHERE "customerId" IS NOT NULL
    GROUP BY "customerId"
  ) receivable_agg ON receivable_agg."customerId" = c.id
  LEFT JOIN (
    SELECT "customerId", MAX("purchasedAt") AS last_purchase_at
    FROM "Sale"
    WHERE "customerId" IS NOT NULL
    GROUP BY "customerId"
  ) sale_agg ON sale_agg."customerId" = c.id;



-- PRODUTO
CREATE VIEW "ProductStats" AS
  SELECT
    p.id,
    p.name,
    COALESCE(variant_agg.count, 0) as "variantCount",
    COALESCE(variant_agg.quantity, 0) as "quantity",
    variant_agg.min_price as "minPrice",
    variant_agg.max_price as "maxPrice",
    category_agg.name AS "categoryName"
  FROM "Product" p
  LEFT JOIN "Category" category_agg ON category_agg.id = p."categoryId"
  LEFT JOIN (
    SELECT
      "productId",
      COUNT(*) as count,
      SUM(quantity) as quantity,
      MIN("salePrice") as min_price,
      MAX("salePrice") as max_price
    FROM "ProductVariant"
    GROUP BY "productId"
  ) variant_agg ON variant_agg."productId" = p.id;



-- TRANSAÇÃO
CREATE VIEW "CashFlowStats" AS
  SELECT
    t.id,
    t.description,
    t.flow,
    t.value,
    t.category
  FROM "CashFlowTransaction" t;