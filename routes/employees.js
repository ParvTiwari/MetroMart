import express from 'express';
import supabase from '../db/pool.js';
const router = express.Router();

// ✅ GET Employees + Departments
router.get('/', async (req, res) => {
  try {
    const { search, department, sort } = req.query;

    // Get departments first
    const { data: departments, error: deptError } = await supabase
      .from('department')
      .select('dep_id, dep_name')
      .order('dep_name');

    if (deptError) throw deptError;

    // Build employees query with Supabase
    let query = supabase
      .from('employees')
      .select(`
        emp_id,
        emp_name,
        email,
        mobile,
        salary,
        department:department!supervisor_id(dep_name)
      `);

    // Apply search filter if provided
    if (search && search.trim() !== '') {
      query = query.or(`
        emp_name.ilike.%${search}%,
        email.ilike.%${search}%,
        mobile.ilike.%${search}%
      `);
    }

    // Apply department filter if provided
    if (department && department.trim() !== '') {
      query = query.eq('department.dep_id', department);
    }

    // Apply sorting
    if (sort === "name_asc") {
      query = query.order('emp_name');
    } else if (sort === "name_desc") {
      query = query.order('emp_name', { ascending: false });
    } else if (sort === "salary_high") {
      query = query.order('salary', { ascending: false });
    } else if (sort === "salary_low") {
      query = query.order('salary');
    } else {
      query = query.order('emp_id');
    }

    const { data: employees, error: empError } = await query;

    if (empError) throw empError;

    res.render('employees', {
      employees: employees || [],
      departments: departments || [],
      search: search || '',
      department: department || '',
      sort: sort || ''
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).send('Error fetching employees');
  }
});

// ✅ POST Add Employee
router.post('/add', async (req, res) => {
  const { emp_name, email, mobile, salary, dep_id } = req.body;
  
  try {
    const { error } = await supabase
      .from('employees')
      .insert([
        { emp_name, email, mobile, salary, dep_id }
      ]);

    if (error) throw error;

    res.redirect('/employees');
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).send('Error adding employee');
  }
});

// ✅ GET Edit Page
router.get('/edit/:emp_id', async (req, res) => {
  try {
    const empId = req.params.emp_id;

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(`
        emp_id,
        emp_name,
        email,
        mobile,
        salary,
        dep_id,
        department:department!supervisor_id(dep_name)
      `)
      .eq('emp_id', empId)
      .single();

    const { data: departments, error: deptError } = await supabase
      .from('department')
      .select('dep_id, dep_name')
      .order('dep_name');

    if (empError || deptError) throw empError || deptError;

    res.render('editEmployee', {
      employee,
      departments
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    res.status(500).send('Error loading edit form');
  }
});

// ✅ POST Update Employee
router.post('/edit/:emp_id', async (req, res) => {
  const empId = req.params.emp_id;
  const { emp_name, email, mobile, salary, dep_id } = req.body;

  try {
    const { error } = await supabase
      .from('employees')
      .update({ emp_name, email, mobile, salary, dep_id })
      .eq('emp_id', empId);

    if (error) throw error;

    res.redirect('/employees');
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).send('Error updating employee');
  }
});

// ✅ POST Delete Employee
router.post('/delete/:emp_id', async (req, res) => {
  const empId = req.params.emp_id;

  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('emp_id', empId);

    if (error) throw error;

    res.redirect('/employees');
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).send('Error deleting employee');
  }
});

export default router;