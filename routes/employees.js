import express from 'express';
import pool, { supabase } from '../db/pool.js';
const router = express.Router();

// ✅ GET Employees + Departments
router.get('/', async (req, res) => {
  const {search, department, sort} = req.query;

  // First try using the pg pool (fast, SQL). If it fails (no SUPABASE_DB_URL), fallback to supabase client.
  try {
    let employeesQuery = `
      SELECT e.emp_id, e.emp_name, e.email, e.mobile, e.salary, e.is_active, d.dep_name
      FROM employees e
      LEFT JOIN department d ON d.supervisor_id = e.emp_id
      where 1=1
      `;
    
    const queryParams = [];

    if (search && search.trim() !== '') {
      employeesQuery += ` 
        AND (
          CAST(e.emp_id AS TEXT) ILIKE $${queryParams.length + 1} OR
          e.emp_name ILIKE $${queryParams.length + 1} OR
          e.email ILIKE $${queryParams.length + 1} OR
          e.mobile ILIKE $${queryParams.length + 1} OR
          CAST(e.salary AS TEXT) ILIKE $${queryParams.length + 1} OR
          d.dep_name ILIKE $${queryParams.length + 1}
        )
      `;
      queryParams.push(`%${search}%`);
    }
    if (department && department.trim() !== '') {
      employeesQuery += ` AND d.dep_id = $${queryParams.length + 1}`;
      queryParams.push(department);
    }

    if(sort === "name_asc") employeesQuery += " ORDER BY e.emp_name"
    else if(sort === "name_desc") employeesQuery += " ORDER BY e.emp_name desc"
    else if(sort === "salary_high") employeesQuery += " ORDER BY e.salary desc"
    else if(sort === "salary_low") employeesQuery += " ORDER BY e.salary asc"
    else if(sort === "dep") employeesQuery += " ORDER BY d.dep_name asc"
    else employeesQuery += " ORDER BY e.emp_id ASC;"

    const departmentsQuery = `SELECT dep_id, dep_name FROM department ORDER BY dep_name ASC;`;
    const departmentsResult = await pool.query(departmentsQuery);

    const employeesResult = await pool.query(employeesQuery, queryParams);

    res.render('employees', {
      employees: employeesResult.rows,
      departments: departmentsResult.rows,
      search,
      department,
      sort
    });
  } catch (err) {
    console.warn('PG query failed, falling back to Supabase client:', err.message || err);
    try {
      // Fetch via supabase client and emulate the same joins/filters in JS
      const { data: employeesData, error: empErr } = await supabase.from('employees').select('*');
      const { data: departmentsData, error: depErr } = await supabase.from('department').select('*').order('dep_name', { ascending: true });
      if (empErr || depErr) throw empErr || depErr;

      // Attach dep_name where the employee is the supervisor of a department
      const enriched = employeesData.map((e) => {
        const dep = departmentsData.find(d => d.supervisor_id === e.emp_id);
        return {
          emp_id: e.emp_id,
          emp_name: e.emp_name,
          email: e.email,
          mobile: e.mobile,
          salary: e.salary,
          is_active: e.is_active,
          dep_name: dep ? dep.dep_name : null
        };
      });

      // Apply search filter if present
      let filtered = enriched;
      if (search && search.trim() !== '') {
        const s = search.toLowerCase();
        filtered = filtered.filter(e =>
          String(e.emp_id).toLowerCase().includes(s) ||
          (e.emp_name || '').toLowerCase().includes(s) ||
          (e.email || '').toLowerCase().includes(s) ||
          (e.mobile || '').toLowerCase().includes(s) ||
          String(e.salary).toLowerCase().includes(s) ||
          (e.dep_name || '').toLowerCase().includes(s)
        );
      }

      if (department && department.trim() !== '') {
        filtered = filtered.filter(e => {
          const dep = departmentsData.find(d => d.supervisor_id === e.emp_id);
          return dep && String(dep.dep_id) === String(department);
        });
      }

      // Sorting
      if (sort === 'name_asc') filtered.sort((a,b) => (a.emp_name||'').localeCompare(b.emp_name||''));
      else if (sort === 'name_desc') filtered.sort((a,b) => (b.emp_name||'').localeCompare(a.emp_name||''));
      else if (sort === 'salary_high') filtered.sort((a,b) => Number(b.salary) - Number(a.salary));
      else if (sort === 'salary_low') filtered.sort((a,b) => Number(a.salary) - Number(b.salary));
      else if (sort === 'dep') filtered.sort((a,b) => (a.dep_name||'').localeCompare(b.dep_name||''));
      else filtered.sort((a,b) => Number(a.emp_id) - Number(b.emp_id));

      res.render('employees', {
        employees: filtered,
        departments: departmentsData,
        search,
        department,
        sort
      });
    } catch (supErr) {
      console.error('Supabase fallback failed for employees route:', supErr);
      res.status(500).send('Error fetching employees');
    }
  }
});

// ✅ POST Add Employee
router.post('/add', async (req, res) => {
  const { emp_name, email, mobile, salary, dep_id } = req.body;
  
  try {
    const insertQuery = `
      INSERT INTO employees (emp_name, email, mobile, salary)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(insertQuery, [emp_name, email, mobile, salary]);
    res.redirect('/employees');
  } catch (err) {
    console.warn('PG insert failed, falling back to Supabase client:', err.message || err);
    try {
      const { data, error } = await supabase.from('employees').insert([{ emp_name, email, mobile, salary }]);
      if (error) throw error;
      res.redirect('/employees');
    } catch (supErr) {
      console.error('Error adding employee via Supabase:', supErr);
      res.status(500).send('Error adding employee');
    }
  }
});

// ✅ GET Edit Page
router.get('/edit/:emp_id', async (req, res) => {
  try {
    const empId = req.params.emp_id;

    const empQuery = 'SELECT * FROM employees WHERE emp_id = $1';
    const deptQuery = 'SELECT dep_id, dep_name FROM department ORDER BY dep_name ASC';

    const [empResult, deptResult] = await Promise.all([
      pool.query(empQuery, [empId]),
      pool.query(deptQuery)
    ]);

    res.render('employees/edit', {
      employee: empResult.rows[0],
      departments: deptResult.rows
    });
  } catch (err) {
    console.warn('PG edit load failed, trying Supabase:', err.message || err);
    try {
      const { data: employee } = await supabase.from('employees').select('*').eq('emp_id', req.params.emp_id).single();
      const { data: departments } = await supabase.from('department').select('dep_id, dep_name').order('dep_name', { ascending: true });
      res.render('employees/edit', { employee, departments });
    } catch (supErr) {
      console.error('Error loading edit form via Supabase:', supErr);
      res.status(500).send('Error loading edit form');
    }
  }
});

// ✅ POST Update Employee
router.post('/edit/:emp_id', async (req, res) => {
  const empId = req.params.emp_id;
  const { emp_name, email, mobile, salary, dep_id, is_active} = req.body;

  const activeStatus = is_active === 'on';

  try {
    const updateQuery = `
      UPDATE employees
      SET emp_name = $1, email = $2, mobile = $3, salary = $4, is_active = $5
      WHERE emp_id = $6
    `;
    await pool.query(updateQuery, [emp_name, email, mobile, salary, activeStatus, empId]);
    res.redirect('/employees');
  } catch (err) {
    console.warn('PG update failed, falling back to Supabase:', err.message || err);
    try {
      const { data, error } = await supabase.from('employees').update({ emp_name, email, mobile, salary, is_active: activeStatus }).eq('emp_id', empId);
      if (error) throw error;
      res.redirect('/employees');
    } catch (supErr) {
      console.error('Error updating employee via Supabase:', supErr);
      res.status(500).send('Error updating employee');
    }
  }
});

// ✅ DELETE Employee
router.get('/delete/:emp_id', async (req, res) => {
  try {
    const empId = req.params.emp_id;
    await pool.query('DELETE FROM employees WHERE emp_id = $1', [empId]);
    res.redirect('/employees');
  } catch (err) {
    console.warn('PG delete failed, falling back to Supabase:', err.message || err);
    try {
      const { data, error } = await supabase.from('employees').delete().eq('emp_id', req.params.emp_id);
      if (error) throw error;
      res.redirect('/employees');
    } catch (supErr) {
      console.error('Error deleting employee via Supabase:', supErr);
      res.status(500).send('Error deleting employee');
    }
  }
});

export default router;