require("dotenv").config();
const bcrypt = require("bcrypt");
const readline = require("readline");
const { pool } = require("../db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  try {
    console.log("\n=== CST Cafe: Create Admin Account ===\n");

    const name = (await ask("Admin name: ")).trim();
    const email = (await ask("Admin email: ")).trim().toLowerCase();
    const password = await ask("Admin password: ");

    if (!name || !email || !password) {
      throw new Error("All fields are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    const existing = await pool.query(
      "SELECT id FROM cst_cafe.admins WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error("An admin with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO cst_cafe.admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );

    console.log("\nAdmin account created successfully!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("\nCould not create admin:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end();
  }
}

main();