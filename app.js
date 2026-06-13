import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import flash from "connect-flash";

dotenv.config(); // Load .env first

//  Import routes & DB pool
import { supabase } from "./db/pool.js";
import employeeRoutes from "./routes/employees.js";
import productRoutes from "./routes/products.js";
import supplierRoutes from "./routes/suppliers.js";
import customerRoutes from "./routes/customers.js";
import departmentRoutes from "./routes/departments.js";
import salesRoutes from "./routes/sales.js";
import returnRoutes from "./routes/returns.js";
import dashboardRoutes from "./routes/dashboard.js";
import supplyOrdersRouter from './routes/supply_orders.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust the platform proxy (Vercel, Render, Nginx, …) so req.protocol reflects
// the original https scheme from X-Forwarded-Proto — keeps canonical/OG URLs correct.
app.set("trust proxy", true);

//  View Engine & Static Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

//  Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Session & Flash Configuration ( REQUIRED for req.flash)
app.use(
  session({
    secret: "metromart_secret_key", // any secure string
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

// Make flash messages available globally (for all views)
app.use((req, res, next) => {
  res.locals.message = req.flash("message");
  res.locals.error = req.flash("error");
  next();
});

// Resolve the public-facing base URL (env override, else inferred from request)
const getSiteUrl = (req) =>
  (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

// Root route
app.get("/", (req, res) => res.render("index", { siteUrl: getSiteUrl(req) }));

// robots.txt — allow the public landing page, keep management routes out of the index
app.get("/robots.txt", (req, res) => {
  const siteUrl = getSiteUrl(req);
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /dashboard",
      "Disallow: /employees",
      "Disallow: /departments",
      "Disallow: /products",
      "Disallow: /suppliers",
      "Disallow: /customers",
      "Disallow: /sales",
      "Disallow: /returns",
      "Disallow: /supply_orders",
      "",
      `Sitemap: ${siteUrl}/sitemap.xml`,
      "",
    ].join("\n")
  );
});

// sitemap.xml — only the public landing page is indexable
app.get("/sitemap.xml", (req, res) => {
  const siteUrl = getSiteUrl(req);
  const lastmod = new Date().toISOString().split("T")[0];
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
  );
});

(async () => {
  try {
    // perform a lightweight read on a known table used by the app to verify connectivity
    const { data, error } = await supabase.from('customers').select('customer_id').limit(1);
    if (error) throw error;
    console.log('Connected to Supabase!');
  } catch (err) {
    console.error('Database connection error:', err.message || err);
  }
})();

// Route mounting
app.use("/dashboard", dashboardRoutes);
app.use("/employees", employeeRoutes);
app.use("/departments", departmentRoutes);
app.use("/products", productRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/customers", customerRoutes);
app.use("/sales", salesRoutes);
app.use("/returns", returnRoutes);
app.use("/supply_orders", supplyOrdersRouter);

app.get(/.*/, (req, res) => {
    res.render("404.ejs");
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
