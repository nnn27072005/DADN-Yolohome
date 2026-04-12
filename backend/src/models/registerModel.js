const { pool } = require("../database/PostgreDatabase");
const { checkIfUserExists } = require("../utils/accounts");

class RegisterModel {
  async addUser(username, password, fullname) {
    try {
      const query =
        "INSERT INTO users (username, password, fullname) VALUES ($1, $2, $3) RETURNING *";
      const result = await pool.query(query, [username, password, fullname]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async registerUser(username, password, fullname) {
    try {
      const isExistUsername = await checkIfUserExists(username);
      if (isExistUsername) {
        return { status: 409, message: "Username already exists" };
      } else {
        await this.addUser(username, password, fullname);
        return { status: 200, message: "User registered successfully" };
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RegisterModel();
