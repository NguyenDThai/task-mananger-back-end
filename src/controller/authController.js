import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email, password);

    // 1. validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email và password là bắt buộc",
      });
    }

    // 2. tìm user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email không tồn tại",
      });
    }

    // 3. check provider
    if (user.provider !== "local") {
      return res.status(400).json({
        message: "Vui lòng đăng nhập bằng Google",
      });
    }

    // 4. so sánh password (dùng method trong model)
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Sai mật khẩu",
      });
    }

    // 5. tạo token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // 6. loại bỏ password
    const { password: _, ...userData } = user.toObject();

    // 7. trả về
    res.json({
      message: "Đăng nhập thành công",
      user: userData,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Đang ký
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // 1. validate input
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Mật khẩu không khớp",
      });
    }

    // 2. check email tồn tại
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email đã được sử dụng",
      });
    }

    // 3. tạo user (password sẽ tự hash ở model)
    const user = await User.create({
      name,
      email,
      password,
    });

    // 4. tạo token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // 5. loại bỏ password
    const { password: _, ...userData } = user.toObject();

    // 6. response
    res.status(201).json({
      message: "Đăng ký thành công",
      user: userData,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
