import Task from '../models/Task.js';

/**
 * Tính toán position mới dựa trên vị trí trên/dưới
 * @param {number|null} prevPos - Position của task phía trên (null nếu ở đầu)
 * @param {number|null} nextPos - Position của task phía dưới (null nếu ở cuối)
 * @returns {number} Position mới được tính toán
 */
const calculateNewPosition = (prevPos, nextPos) => {
  // Trường hợp: cả prevPos và nextPos là null => vị trí đơn lẻ
  if (prevPos === null && nextPos === null) {
    return 1000;
  }

  // Trường hợp: prevPos null (ở đầu danh sách)
  if (prevPos === null) {
    return nextPos - 1000;
  }

  // Trường hợp: nextPos null (ở cuối danh sách)
  if (nextPos === null) {
    return prevPos + 1000;
  }

  // Trường hợp: cả hai đều có giá trị - tính midpoint
  return (prevPos + nextPos) / 2;
};

/**
 * Kiểm tra và rebalance lại positions nếu cần
 * @param {string} status - Status của task
 * @param {string|null} parentTask - ID của task cha (nếu là subtask)
 */
const checkAndRebalancePositions = async (status, parentTask) => {
  const query = parentTask ? { parentTask } : { status, parentTask: null };

  const tasks = await Task.find(query).sort({ position: 1 });

  if (tasks.length < 2) return;

  // Kiểm tra xem có gap nhỏ hơn 0.001 không
  let needsRebalance = false;
  for (let i = 0; i < tasks.length - 1; i++) {
    const gap = tasks[i + 1].position - tasks[i].position;
    if (gap < 0.001) {
      needsRebalance = true;
      break;
    }
  }

  // Nếu cần rebalance, reset tất cả positions thành increments của 1000
  if (needsRebalance) {
    const bulkOps = tasks.map((task, index) => ({
      updateOne: {
        filter: { _id: task._id },
        update: { $set: { position: (index + 1) * 1000 } },
      },
    }));

    await Task.bulkWrite(bulkOps);
  }
};

/**
 * Precision guard để tránh float artifacts
 * @param {number} position - Position cần làm tròn
 * @returns {number} Position được làm tròn
 */
const roundPosition = (position) => {
  return Math.round(position * 1e10) / 1e10;
};

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

    // Tìm task đầu tiên trong cột để xếp task mới lên TRÊN CÙNG
    const query = parentTask ? { parentTask } : { status: status || 'None', parentTask: null };
    const firstTask = await Task.findOne(query).sort('position');
    const newPosition = firstTask ? firstTask.position - 1000 : 1000;

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ parentTask: null })
      .populate({
        path: 'subtasks',
        options: { sort: { position: 1 } },
        populate: [
          { path: 'createdBy', select: 'name avatar' },
          { path: 'assignees', select: 'name avatar' },
        ],
      })
      .populate('createdBy', 'name avatar')
      .populate('assignees', 'name avatar')
      .sort({ position: 1 })
      .skip(skip)
      .limit(limit);

    const totalTasks = await Task.countDocuments({ parentTask: null });
    const hasMore = skip + tasks.length < totalTasks;

    return res.json({
      tasks,
      pagination: {
        currentPage: page,
        totalTasks,
        hasMore,
      },
    });
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
        options: { sort: { position: 1 } },
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
    const { addAssignees, removeAssignees, prevPos, nextPos, ...updateData } = req.body;

    // Tính toán position mới nếu có thông tin reordering
    if (prevPos !== undefined || nextPos !== undefined) {
      const newPosition = calculateNewPosition(prevPos, nextPos);
      updateData.position = roundPosition(newPosition);
    }

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

    // Kiểm tra và rebalance positions nếu cần
    if (updateData.status || updateData.parentTask) {
      const status = updateData.status || task.status;
      const parentTask = updateData.parentTask || task.parentTask;
      await checkAndRebalancePositions(status, parentTask);
    } else if (prevPos !== undefined || nextPos !== undefined) {
      // Nếu chỉ thay đổi position, kiểm tra rebalance
      await checkAndRebalancePositions(task.status, task.parentTask);
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
