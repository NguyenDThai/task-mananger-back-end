import Task from '../models/Task.js';

// @desc    Tạo task mới
// @route   POST /api/tasks
// @access  Private
// @desc    Tạo task mới
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    const { name, status, dueDate, estimated, priority, labels, parentTask, description } =
      req.body;

    // 1. Kiểm tra trường tên (bắt buộc duy nhất để hỗ trợ Quick Add)
    if (!name) {
      return res.status(400).json({
        message: 'Tên công việc là bắt buộc',
      });
    }

    // Tìm task cuối cùng trong cột để xếp task mới xuống dưới cùng
    const lastTask = await Task.findOne({ status: status || 'None', parentTask: null }).sort(
      '-position',
    );
    const newPosition = lastTask ? lastTask.position + 1 : 0;

    // 2. Tạo task mới
    const task = await Task.create({
      name,
      description: description || '',
      status: status || 'None',
      dueDate: dueDate || new Date(),
      estimated: estimated || '',
      priority: priority || 'Medium',
      labels: labels || [],
      parentTask: parentTask || null,
      createdBy: req.user.id,
      position: newPosition,
    });

    // 3. Nếu đây là subtask, cập nhật mảng subtasks của task cha
    if (parentTask) {
      await Task.findByIdAndUpdate(parentTask, {
        $push: { subtasks: task._id },
      });
    }

    // 4. Populate thông tin người dùng trước khi trả về
    const populatedTask = await Task.findById(task._id).populate('createdBy', 'name avatar');

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
        path: 'subtasks',
        populate: [
          { path: 'createdBy', select: 'name avatar' },
          { path: 'assignees', select: 'name avatar' },
        ],
      })
      .populate('createdBy', 'name avatar')
      .populate('assignees', 'name avatar')
      .sort({ position: 1 });

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
      .populate('createdBy', 'name avatar')
      .populate('assignees', 'name avatar')
      .populate({
        path: 'subtasks',
        populate: [
          { path: 'createdBy', select: 'name avatar' },
          { path: 'assignees', select: 'name avatar' },
        ],
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
    // const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    //   new: true,
    //   runValidators: true,
    // }).populate('createdBy', 'name avatar');

    // if (!task) {
    //   return res.status(404).json({ message: 'Task không tồn tại' });
    // }

    // res.json(task);

    const { addAssignees, removeAssignees, ...updateData } = req.body;

    const updateQuery = {
      $set: updateData,
    };

    // Thêm người không trùng
    if (addAssignees && addAssignees.length > 0) {
      updateQuery.$addToSet = {
        assignees: { $each: addAssignees },
      };
    }

    // Xóa người
    if (removeAssignees && removeAssignees.length > 0) {
      updateQuery.$pull = {
        assignees: { $in: removeAssignees },
      };
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateQuery, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name avatar')
      .populate('assignees', 'name avatar');

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

// @desc    Xóa nhiều task
// @route   POST /api/tasks/bulk-delete
// @access  Private
export const bulkDeleteTasks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
    }

    // Xóa các task
    const result = await Task.deleteMany({ _id: { $in: ids } });

    // Cập nhật các task cha nếu có can thiệp xóa subtasks
    await Task.updateMany({ subtasks: { $in: ids } }, { $pull: { subtasks: { $in: ids } } });

    res.json({ message: `Đã xóa ${result.deletedCount} task thành công` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server', error: error.message });
  }
};
