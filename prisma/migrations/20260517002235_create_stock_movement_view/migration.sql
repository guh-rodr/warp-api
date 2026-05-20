CREATE VIEW "StockMovementStats" AS
      WITH movement_balance AS (
        SELECT 
          sm.id,
          sm.type,
          sm."saleId",
          sm."unitCost",
          sm.quantity,
          sm.origin,
          sm.date,
          sm.reason,

          SUM(
            CASE 
              WHEN sm.type = 'ENTRY' THEN sm.quantity
              WHEN sm.type = 'EXIT' THEN -sm.quantity
              ELSE 0
            END
          ) OVER (
            PARTITION BY sm."variantId"
            ORDER BY sm.date ASC, sm.id ASC
          )::INT AS balance,

          p.id AS "productId",
          p.name AS "productName",
          pv.id AS "variantId",
          pv.size AS "variantSize",
          pv.color AS "variantColor"

        FROM "StockMovement" sm
        LEFT JOIN "ProductVariant" pv ON pv.id = sm."variantId"
        LEFT JOIN "Product" p ON p.id = pv."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
      )

      SELECT *
      FROM movement_balance