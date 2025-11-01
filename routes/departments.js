import express from 'express';
import pool from "../db/pool.js";
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
    console.error("Error fetching departments:", err);
    res.status(500).send("Error fetching departments");
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
    console.error("Error adding department:", err);
    res.status(500).send("Error adding department");
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
    console.error("Error loading edit page:", err);
    res.status(500).send("Error loading edit page");
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
    console.error("Error updating department:", err);
    res.status(500).send("Error updating department");
  }
});

// ✅ DELETE Department
router.get("/delete/:dep_id", async (req, res) => {
  try {
    const depId = req.params.dep_id;
    await pool.query(`DELETE FROM department WHERE dep_id = $1;`, [depId]);
    res.redirect("/departments");
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).send("Error deleting department");
  }
});

export default router;
