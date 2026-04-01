import jwt from 'jsonwebtoken';

import User from '../models/User.js';

export const protect = async (req, res, next) => {
  // 1. Lấy token từ cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: 'Bạn chưa đăng nhập',
    });
  }

  try {
    // 2. Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Kiểm tra user còn tồn tại không
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        message: 'Người dùng không còn tồn tại',
      });
    }

    // 4. Gán user vào request
    req.user = currentUser;
    next();
  } catch (_error) {
    return res.status(401).json({
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
};
