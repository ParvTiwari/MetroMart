import express from "express";
import { supabase } from "../db/pool.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        product_code,
        product_name,
        price,
        stock,
        reorder_level,
        is_active,
        last_updated,
        department:dep_num (dep_name)
      `)
      .order("product_code", { ascending: true });

    if (error) throw error;

    const { data: departments, error: deptError } = await supabase
      .from("department")
      .select("dep_id, dep_name")
      .order("dep_name", { ascending: true });

    if (deptError) throw deptError;

    res.render("products", {
      products: products.map(p => ({
        ...p,
        department_name: p.department?.dep_name || "Unknown"
      })),
      departments,
      search: "",
      sort: ""
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Error fetching products");
  }
});


// ✅ POST Add Product
router.post("/add", async (req, res) => {
  const { product_code, product_name, price, stock, reorder_level, dep_num } = req.body;

  try {
    await pool.query(
      `INSERT INTO products (product_code, product_name, price, stock, reorder_level, dep_num)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [product_code, product_name, price, stock, reorder_level, dep_num]
    );
    res.redirect("/products");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Error adding product");
  }
});

// ✅ GET Edit Product Page
router.get("/edit/:product_code", async (req, res) => {
  try {
    const code = req.params.product_code;
    const [productResult, deptResult] = await Promise.all([
      pool.query("SELECT * FROM products WHERE product_code = $1;", [code]),
      pool.query("SELECT dep_id, dep_name FROM department ORDER BY dep_name ASC;")
    ]);

    res.render("products/edit", {
      product: productResult.rows[0],
      departments: deptResult.rows
    });
  } catch (err) {
    console.error("Error loading edit page:", err);
    res.status(500).send("Error loading edit page");
  }
});

// ✅ POST Update Product
router.post("/edit/:product_code", async (req, res) => {
  const code = req.params.product_code;
  const { product_name, price, stock, reorder_level, dep_num, is_active } = req.body;

  try {
    await pool.query(
      `UPDATE products
       SET product_name = $1, price = $2, stock = $3, reorder_level = $4,
           dep_num = $5, is_active = $6, last_updated = NOW()
       WHERE product_code = $7;`,
      [product_name, price, stock, reorder_level, dep_num, is_active === "true", code]
    );
    res.redirect("/products");
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Error updating product");
  }
});

// ✅ DELETE Product
router.get("/delete/:product_code", async (req, res) => {
  try {
    const code = req.params.product_code;
    await pool.query("DELETE FROM products WHERE product_code = $1;", [code]);
    res.redirect("/products");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Error deleting product");
  }
});

export default router;
