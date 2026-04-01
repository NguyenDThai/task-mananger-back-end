import Task from "../models/Task.js";

// @desc    Tạo task mới
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    const {
      name,
      assignee,
      status,
      dueDate,
      estimated,
      priority,
      labels,
      parentTask,
    } = req.body;

    // 1. Kiểm tra các trường bắt buộc
    if (!name || !assignee || !dueDate) {
      return res.status(400).json({
        message: "Tên task, người thực hiện và ngày hết hạn là bắt buộc",
      });
    }

    // 2. Tạo task mới
    const task = await Task.create({
      name,
      assignee,
      status,
      dueDate,
      estimated,
      priority,
      labels,
      parentTask: parentTask || null,
    });

    // 3. Nếu đây là subtask, cập nhật mảng subtasks của task cha
    if (parentTask) {
      await Task.findByIdAndUpdate(parentTask, {
        $push: { subtasks: task._id },
      });
    }

    // 4. Populate thông tin người dùng trước khi trả về
    const populatedTask = await Task.findById(task._id).populate(
      "assignee",
      "name avatar",
    );

    res.status(201).json({
      message: "Tạo task thành công",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi Server",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách tất cả tasks (chỉ lấy task cha, subtasks sẽ được populate)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ parentTask: null })
      .populate({
        path: "assignee",
        select: "name avatar",
      })
      .populate({
        path: "subtasks",
        populate: {
          path: "assignee",
          select: "name avatar",
        },
      })
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};
