import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['None', 'Doing', 'Stuck', 'Pending', 'Done'],
      default: 'None',
    },
    dueDate: {
      type: Date, // Properly set as Date
      required: true,
    },
    estimated: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['Urgent', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    labels: [
      {
        type: String,
      },
    ],
    // Subtasks can be nested tasks
    subtasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    // Alternatively, parentTask field for easier flat queries
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // Người được giao task
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Người tạo tasks
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Task = mongoose.model('Task', taskSchema);
export default Task;
