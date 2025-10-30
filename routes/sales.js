import express from "express";
import pool from '../db/pool.js';

const router = express.Router();

// GET all sales + form data
router.get("/", async (req, res) => {
  try {
    const [sales, customers, employees, products] = await Promise.all([
      pool.query(`
        SELECT s.*, c.customer_name, e.emp_name
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        JOIN employees e ON s.emp_id = e.emp_id
        ORDER BY s.invoice_num DESC
      `),
      pool.query("SELECT * FROM customers ORDER BY customer_name ASC"),
      pool.query("SELECT * FROM employees ORDER BY emp_name ASC"),
      pool.query("SELECT * FROM products WHERE is_active = true ORDER BY product_name ASC")
    ]);

    res.render("sales", {
      sales: sales.rows,
      customers: customers.rows,
      employees: employees.rows,
      products: products.rows
    });
  } catch (err) {
    console.error("Error loading sales:", err.message);
    res.status(500).send("Error loading sales page.");
  }
});

// POST new sale
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_id, emp_id, discount_applied, tax_amount, items } = req.body;
    const parsedItems = JSON.parse(items);

    let subTotal = parsedItems.reduce((sum, i) => sum + (i.quantity * i.selling_price), 0);

    await client.query("BEGIN");
    const invoiceRes = await client.query(
      `INSERT INTO sales_invoices (customer_id, emp_id, sub_total, discount_applied, tax_amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING invoice_num`,
      [customer_id, emp_id, subTotal, discount_applied, tax_amount]
    );

    const invoiceNum = invoiceRes.rows[0].invoice_num;

    for (const item of parsedItems) {
      await client.query(
        `INSERT INTO sales_details (invoice_num, product_code, quantity, selling_price)
         VALUES ($1, $2, $3, $4)`,
        [invoiceNum, item.product_code, item.quantity, item.selling_price]
      );
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE product_code = $2`,
        [item.quantity, item.product_code]
      );
    }

    await client.query("COMMIT");
    res.redirect("/sales");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error processing sale:", err.message);
    res.status(500).send("Error processing sale.");
  } finally {
    client.release();
  }
});

export default router;
