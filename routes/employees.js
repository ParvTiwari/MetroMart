import express from 'express';
import pool from '../db/pool.js';
const router = express.Router();

// ✅ GET Employees + Departments
router.get('/', async (req, res) => {
  try {
    const employeesQuery = `
      SELECT e.emp_id, e.emp_name, e.email, e.mobile, e.salary, d.dep_name
      FROM employees e
      LEFT JOIN department d ON d.supervisor_id = e.emp_id
      ORDER BY e.emp_id ASC;
    `;

    const departmentsQuery = `SELECT dep_id, dep_name FROM department ORDER BY dep_name ASC;`;

    const employeesResult = await pool.query(employeesQuery);
    const departmentsResult = await pool.query(departmentsQuery);

    res.render('employees', {
      employees: employeesResult.rows,
      departments: departmentsResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching employees');
  }
});

// ✅ POST Add Employee
router.post('/add', async (req, res) => {
  const { emp_name, email, mobile, salary, dep_id } = req.body;
  
  try {
    const insertQuery = `
      INSERT INTO employees (emp_name, email, mobile, salary, dep_id)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await pool.query(insertQuery, [emp_name, email, mobile, salary, dep_id]);
    res.redirect('/employees');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding employee');
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

    res.render('editEmployee', {
      employee: empResult.rows[0],
      departments: deptResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit form');
  }
});

// ✅ POST Update Employee
router.post('/edit/:emp_id', async (req, res) => {
  const empId = req.params.emp_id;
  const { emp_name, email, mobile, salary, dep_id } = req.body;

  try {
    const updateQuery = `
      UPDATE employees
      SET emp_name = $1, email = $2, mobile = $3, salary = $4, dep_id = $5
      WHERE emp_id = $6;
    `;
    await pool.query(updateQuery, [emp_name, email, mobile, salary, dep_id, empId]);
    res.redirect('/employees');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating employee');
  }
});

// ✅ DELETE Employee
router.get('/delete/:emp_id', async (req, res) => {
  try {
    const empId = req.params.emp_id;
    await pool.query('DELETE FROM employees WHERE emp_id = $1', [empId]);
    res.redirect('/employees');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting employee');
  }
});

export default router;