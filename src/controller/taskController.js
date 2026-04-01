import Task from '../models/Task.js';

// @desc    Tạo task mới
// @route   POST /api/tasks
// @access  Private
// @desc    Tạo task mới
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    const { name, assignee, status, dueDate, estimated, priority, labels, parentTask } = req.body;

    // 1. Kiểm tra trường tên (bắt buộc duy nhất để hỗ trợ Quick Add)
    if (!name) {
      return res.status(400).json({
        message: 'Tên công việc là bắt buộc',
      });
    }

    // 2. Tạo task mới (Lấy user đang đăng nhập làm mặc định nếu không có assignee)
    const task = await Task.create({
      name,
      assignee: assignee || req.user.id,
      status: status || 'None',
      dueDate: dueDate || new Date(),
      estimated: estimated || '',
      priority: priority || 'Medium',
      labels: labels || [],
      parentTask: parentTask || null,
    });

    // 3. Nếu đây là subtask, cập nhật mảng subtasks của task cha
    if (parentTask) {
      await Task.findByIdAndUpdate(parentTask, {
        $push: { subtasks: task._id },
      });
    }

    // 4. Populate thông tin người dùng trước khi trả về
    const populatedTask = await Task.findById(task._id).populate('assignee', 'name avatar');

    res.status(201).json({
      message: 'Tạo task thành công',
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi Server',
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
        path: 'assignee',
        select: 'name avatar',
      })
      .populate({
        path: 'subtasks',
        populate: {
          path: 'assignee',
          select: 'name avatar',
        },
      })
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi Server', error: error.message });
  }
};

// @desc    Lấy chi tiết task
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name avatar')
      .populate({
        path: 'subtasks',
        populate: { path: 'assignee', select: 'name avatar' },
      });

    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server', error: error.message });
  }
};

// @desc    Cập nhật task
// @route   PATCH /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignee', 'name avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server', error: error.message });
  }
};

// @desc    Xóa task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    // Nếu là subtask, xóa ID khỏi mảng subtasks của cha
    if (task.parentTask) {
      await Task.findByIdAndUpdate(task.parentTask, {
        $pull: { subtasks: task._id },
      });
    }

    res.json({ message: 'Xóa task thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server', error: error.message });
  }
};
