import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); // ✅ load .env first

import supabase from './db/pool.js'; // ✅ use Supabase client
import employeeRoutes from './routes/employees.js';
import productRoutes from './routes/products.js';
import supplierRoutes from './routes/suppliers.js';
import customerRoutes from './routes/customers.js';
import departmentRoutes from './routes/departments.js';
import salesRoutes from './routes/sales.js';
import returnRoutes from './routes/returns.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.get('/', (req, res) => res.render('index'));

// Test connection once
(async () => {
  try {
    // Test Supabase connection by checking if we can access the database
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    if (error) throw error;
    console.log("✅ Connected to Supabase!");
  } catch (err) {
    console.error("❌ Supabase connection error:", err.message);
  }
})();

app.use('/employees', employeeRoutes);
app.use('/departments', departmentRoutes);
app.use('/products', productRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/customers', customerRoutes);
app.use('/sales', salesRoutes);
app.use('/returns', returnRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
