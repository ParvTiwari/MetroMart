import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import flash from "connect-flash";

dotenv.config(); // ✅ Load .env first

// 🧩 Import routes & DB pool
import pool from "./db/pool.js";
import employeeRoutes from "./routes/employees.js";
import productRoutes from "./routes/products.js";
import supplierRoutes from "./routes/suppliers.js";
import customerRoutes from "./routes/customers.js";
import departmentRoutes from "./routes/departments.js";
import salesRoutes from "./routes/sales.js";
import returnRoutes from "./routes/returns.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧱 View Engine & Static Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// 🧠 Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// 🧩 Session & Flash Configuration (✨ REQUIRED for req.flash)
app.use(
  session({
    secret: "metromart_secret_key", // any secure string
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

// 🌐 Make flash messages available globally (for all views)
app.use((req, res, next) => {
  res.locals.message = req.flash("message");
  res.locals.error = req.flash("error");
  next();
});

// 🏠 Root route
app.get("/", (req, res) => res.render("index"));

// 🧾 Test DB connection once on startup
(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected to PostgreSQL!");
    console.log("🕒 Server time:", result.rows[0].now);
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

// 🛣️ Route mounting
app.use("/employees", employeeRoutes);
app.use("/departments", departmentRoutes);
app.use("/products", productRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/customers", customerRoutes);
app.use("/sales", salesRoutes);
app.use("/returns", returnRoutes);

// 🚀 Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
