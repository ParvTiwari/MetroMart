import express from "express";
import { supabase } from "../db/pool.js";

const router = express.Router();

// GET All Products (with search + sort)
router.get("/", async (req, res) => {
  try {
    const { search = "", sort = "" } = req.query;

    let query = supabase
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
      `);

    // Search filter
    if (search) {
      query = query.ilike("product_name", `%${search}%`);
    }

    // Sorting logic
    switch (sort) {
      case "name_asc":
        query = query.order("product_name", { ascending: true });
        break;
      case "name_desc":
        query = query.order("product_name", { ascending: false });
        break;
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      default:
        query = query.order("product_code", { ascending: true });
    }

    const { data: products, error } = await query;
    if (error) throw error;

    const { data: departments, error: deptError } = await supabase
      .from("department")
      .select("dep_id, dep_name")
      .order("dep_name", { ascending: true });

    if (deptError) throw deptError;

    res.render("products", {
      products: products.map((p) => ({
        ...p,
        department_name: p.department?.dep_name || "Unknown",
      })),
      departments,
      search,
      sort,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Error fetching products");
  }
});

//  POST Add Product
router.post("/add", async (req, res) => {
  const { product_code, product_name, price, stock, reorder_level, dep_num } = req.body;

  try {
    const { error } = await supabase.from("products").insert([
      {
        product_code,
        product_name,
        price: parseFloat(price),
        stock: parseInt(stock),
        reorder_level: parseInt(reorder_level),
        dep_num: parseInt(dep_num),
        is_active: true,
        last_updated: new Date(),
      },
    ]);

    if (error) throw error;
    res.redirect("/products");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Error adding product");
  }
});

//GET Edit Product Page
router.get("/edit/:product_code", async (req, res) => {
  try {
    const code = req.params.product_code;

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("product_code", code)
      .single();

    if (productError) throw productError;

    const { data: departments, error: deptError } = await supabase
      .from("department")
      .select("dep_id, dep_name")
      .order("dep_name", { ascending: true });

    if (deptError) throw deptError;

    res.render("products/edit", {
      product: productData,
      departments,
    });
  } catch (err) {
    console.error("Error loading edit page:", err);
    res.status(500).send("Error loading edit page");
  }
});

// Update Product (Price, Stock, Reorder)
router.post("/edit/:product_code", async (req, res) => {
  const code = req.params.product_code;
  const { price, stock, reorder_level } = req.body;

  try {
    const { error } = await supabase
      .from("products")
      .update({
        price: parseFloat(price),
        stock: parseInt(stock),
        reorder_level: parseInt(reorder_level),
        last_updated: new Date(),
      })
      .eq("product_code", code);

    if (error) throw error;
    res.redirect("/products");
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Error updating product");
  }
});

//  DELETE Product
router.get("/delete/:product_code", async (req, res) => {
  try {
    const code = req.params.product_code;
    const { error } = await supabase.from("products").delete().eq("product_code", code);
    if (error) throw error;
    res.redirect("/products");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Error deleting product");
  }
});

export default router;
