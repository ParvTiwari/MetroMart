-- Dummy sales seed script for Supabase/Postgres
-- Requirements: at least 1 employee, 1 product (is_active), optional customers.
-- Run as a single script inside the Supabase SQL editor.

BEGIN;

WITH customer_choices AS (
  SELECT customer_id, ROW_NUMBER() OVER (ORDER BY customer_id) AS rn
  FROM customers
),
employee_choices AS (
  SELECT emp_id, ROW_NUMBER() OVER (ORDER BY emp_id) AS rn
  FROM employees
),
product_choices AS (
  SELECT product_code,
         COALESCE(NULLIF(price, 0), 25.00)::numeric(10,2) AS price,
         ROW_NUMBER() OVER (ORDER BY product_code) AS rn
  FROM products
  WHERE is_active IS DISTINCT FROM false
  ORDER BY product_code
  LIMIT 3
),
invoice_seed AS (
  -- invoice_slot, customer_slot (nullable), employee_slot, discount_pct, tax_pct
  VALUES
    (1, 1, 1, 0.05, 0.08),
    (2, 2, 1, 0.00, 0.07),
    (3, NULL, 1, 0.03, 0.06)
),
inserted_invoices AS (
  INSERT INTO sales_invoices (customer_id, emp_id, sub_total, discount_applied, tax_amount)
  SELECT
    CASE
      WHEN s.column2 IS NULL THEN NULL
      ELSE (SELECT customer_id FROM customer_choices WHERE rn = s.column2)
    END,
    COALESCE(
      (SELECT emp_id FROM employee_choices WHERE rn = s.column3),
      (SELECT emp_id FROM employee_choices LIMIT 1)
    ),
    0,
    0,
    0
  FROM invoice_seed s
  RETURNING invoice_num, ROW_NUMBER() OVER (ORDER BY invoice_num) AS rn, invoice_num AS raw_invoice_num
),
detail_seed AS (
  -- invoice_slot, product_slot, quantity, fallback_price
  VALUES
    (1, 1, 2, 75.00),
    (1, 2, 1, 45.00),
    (2, 2, 1, 45.00),
    (2, 3, 3, 18.75),
    (3, 1, 1, 75.00),
    (3, 3, 2, 18.75)
),
inserted_details AS (
  INSERT INTO sales_details (invoice_num, product_code, quantity, selling_price)
  SELECT
    inv.raw_invoice_num,
    pc.product_code,
    ds.column3,
    COALESCE(pc.price, ds.column4)::numeric(10,2)
  FROM detail_seed ds
  JOIN inserted_invoices inv ON inv.rn = ds.column1
  JOIN product_choices pc ON pc.rn = ds.column2
  RETURNING invoice_num, quantity, selling_price
),
agg_totals AS (
  SELECT invoice_num,
         SUM(quantity * selling_price)::numeric(12,2) AS sub_total
  FROM inserted_details
  GROUP BY invoice_num
)
UPDATE sales_invoices si
SET sub_total = agg.sub_total,
    discount_applied = ROUND(agg.sub_total * inv_cfg.discount_pct, 2),
    tax_amount = ROUND((agg.sub_total - ROUND(agg.sub_total * inv_cfg.discount_pct, 2)) * inv_cfg.tax_pct, 2)
FROM agg_totals agg
JOIN inserted_invoices ii ON ii.raw_invoice_num = agg.invoice_num
JOIN invoice_seed inv_cfg ON inv_cfg.column1 = ii.rn
WHERE si.invoice_num = agg.invoice_num
RETURNING si.invoice_num,
          si.sub_total,
          si.discount_applied,
          si.tax_amount,
          si.final_amount;

COMMIT;

-- Optional: inspect the line items that were inserted
-- SELECT * FROM sales_details WHERE invoice_num IN (SELECT invoice_num FROM sales_invoices ORDER BY invoice_num DESC LIMIT 3);
