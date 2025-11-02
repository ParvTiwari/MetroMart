import express from 'express';
import pool, { supabase } from "../db/pool.js";
const router = express.Router();

// ✅ GET All Departments (with optional search/sort)
router.get("/", async (req, res) => {
  try {
    const { search, sort } = req.query;

    let query = `
      SELECT d.dep_id, d.dep_name, e.emp_name AS supervisor_name
      FROM department d
      LEFT JOIN employees e ON d.supervisor_id = e.emp_id
      WHERE 1=1
    `;

    const params = [];

    if (search && search.trim() !== "") {
      query += ` AND d.dep_name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    // ✅ Sorting options
    if (sort === "name_asc") query += " ORDER BY d.dep_name ASC";
    else if (sort === "name_desc") query += " ORDER BY d.dep_name DESC";
    else if (sort === "sup") query += " ORDER BY e.emp_name ASC";
    else query += " ORDER BY d.dep_id ASC";

    // ✅ Get departments + employees (for form)
    const [departmentsResult, employeesResult] = await Promise.all([
      pool.query(query, params),
      pool.query("SELECT emp_id, emp_name FROM employees ORDER BY emp_name ASC;")
    ]);

    res.render("departments", {
      departments: departmentsResult.rows,
      employees: employeesResult.rows,
      search,
      sort
    });
  } catch (err) {
    console.warn('PG query failed for departments, falling back to Supabase client:', err.message || err);
    try {
      const { data: departmentsData, error: depErr } = await supabase.from('department').select('dep_id, dep_name, supervisor_id').order('dep_name', { ascending: true });
      const { data: employeesData, error: empErr } = await supabase.from('employees').select('emp_id, emp_name').order('emp_name', { ascending: true });
      if (depErr || empErr) throw depErr || empErr;

      // Simple server-side search/filter/sort emulation to match SQL behaviour
      let filtered = departmentsData;
      if (search && search.trim() !== '') {
        const s = search.toLowerCase();
        filtered = filtered.filter(d => (d.dep_name || '').toLowerCase().includes(s));
      }

      if (sort === 'name_asc') filtered.sort((a,b) => (a.dep_name||'').localeCompare(b.dep_name||''));
      else if (sort === 'name_desc') filtered.sort((a,b) => (b.dep_name||'').localeCompare(a.dep_name||''));
      else if (sort === 'sup') filtered.sort((a,b) => {
        const aSup = employeesData.find(e => e.emp_id === a.supervisor_id)?.emp_name || '';
        const bSup = employeesData.find(e => e.emp_id === b.supervisor_id)?.emp_name || '';
        return aSup.localeCompare(bSup);
      });
      else filtered.sort((a,b) => Number(a.dep_id) - Number(b.dep_id));

      // Enrich with supervisor_name for the template (SQL version returns this column)
      const enriched = filtered.map(d => {
        const sup = employeesData.find(e => e.emp_id === d.supervisor_id);
        return { ...d, supervisor_name: sup ? sup.emp_name : null };
      });

      res.render('departments', { departments: enriched, employees: employeesData, search, sort });
    } catch (supErr) {
      console.error('Supabase fallback failed for departments route:', supErr);
      res.status(500).send('Error fetching departments');
    }
  }
});

// ✅ POST Add Department
router.post("/add", async (req, res) => {
  const { dep_name, supervisor_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO department (dep_name, supervisor_id) VALUES ($1, $2);`,
      [dep_name, supervisor_id || null]
    );
    res.redirect("/departments");
  } catch (err) {
    console.warn('PG insert failed for department, falling back to Supabase:', err.message || err);
    try {
      const { data, error } = await supabase.from('department').insert([{ dep_name, supervisor_id: supervisor_id || null }]);
      if (error) throw error;
      res.redirect('/departments');
    } catch (supErr) {
      console.error('Error adding department via Supabase:', supErr);
      res.status(500).send('Error adding department');
    }
  }
});

// ✅ GET Edit Department Page
router.get("/edit/:dep_id", async (req, res) => {
  try {
    const depId = req.params.dep_id;

    const depQuery = `
      SELECT d.dep_id, d.dep_name, d.supervisor_id, e.emp_name AS supervisor_name
      FROM department d
      LEFT JOIN employees e ON d.supervisor_id = e.emp_id
      WHERE d.dep_id = $1;
    `;

    const empQuery = "SELECT emp_id, emp_name FROM employees ORDER BY emp_name ASC;";
    const [depResult, empResult] = await Promise.all([
      pool.query(depQuery, [depId]),
      pool.query(empQuery)
    ]);

    res.render("departments/edit", {
      department: depResult.rows[0],
      employees: empResult.rows
    });
  } catch (err) {
    console.warn('PG edit load failed for department, trying Supabase:', err.message || err);
    try {
      const { data: department } = await supabase.from('department').select('dep_id, dep_name, supervisor_id').eq('dep_id', req.params.dep_id).single();
      const { data: employees } = await supabase.from('employees').select('emp_id, emp_name').order('emp_name', { ascending: true });
      res.render('departments/edit', { department, employees });
    } catch (supErr) {
      console.error('Error loading edit page via Supabase:', supErr);
      res.status(500).send('Error loading edit page');
    }
  }
});

// ✅ POST Update Department
router.post("/edit/:dep_id", async (req, res) => {
  const depId = req.params.dep_id;
  const { dep_name, supervisor_id } = req.body;

  try {
    await pool.query(
      `UPDATE department SET dep_name = $1, supervisor_id = $2 WHERE dep_id = $3;`,
      [dep_name, supervisor_id || null, depId]
    );
    res.redirect("/departments");
  } catch (err) {
    console.warn('PG update failed for department, falling back to Supabase:', err.message || err);
    try {
      const { data, error } = await supabase.from('department').update({ dep_name, supervisor_id: supervisor_id || null }).eq('dep_id', depId);
      if (error) throw error;
      res.redirect('/departments');
    } catch (supErr) {
      console.error('Error updating department via Supabase:', supErr);
      res.status(500).send('Error updating department');
    }
  }
});

// ✅ DELETE Department
router.get("/delete/:dep_id", async (req, res) => {
  try {
    const depId = req.params.dep_id;
    await pool.query(`DELETE FROM department WHERE dep_id = $1;`, [depId]);
    res.redirect("/departments");
  } catch (err) {
    console.warn('PG delete failed for department, falling back to Supabase:', err.message || err);
    try {
      const { data, error } = await supabase.from('department').delete().eq('dep_id', req.params.dep_id);
      if (error) throw error;
      res.redirect('/departments');
    } catch (supErr) {
      console.error('Error deleting department via Supabase:', supErr);
      res.status(500).send('Error deleting department');
    }
  }
});

export default router;
