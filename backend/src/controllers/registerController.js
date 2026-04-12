const RegisterModel = require("../models/registerModel");
const { encrypt } = require("../utils/encrypt");

const registerUser = async (req, res) => {
  try {
    const { username, password, fullname } = req.body;
    if (!username || !password || !fullname) {
      return res
        .status(400)
        .json({ message: "Username, password and fullname are required" });
    }
    const encryptedPassword = encrypt(password);
    const result = await RegisterModel.registerUser(
      username,
      encryptedPassword,
      fullname
    );
    res.status(result.status).json({ message: result.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerUser };