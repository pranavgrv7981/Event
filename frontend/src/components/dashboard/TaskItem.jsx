import React from "react";
import { User, Clock } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { getPriorityStyle } from "../../utils/formatters";

export default function TaskItem({ task }) {
  const priorityClass = getPriorityStyle(task.priority);

  return (
    <div className={`task-list-card ${task.isUrgent ? "urgent-task" : ""}`}>
      {/* Left Priority & Status Indicators */}
      <div className="task-header-row">
        <div className="task-title-group">
          <h4 className="task-title">{task.title}</h4>
          {task.category && <span className="task-category-tag">{task.category}</span>}
        </div>
        <div className="task-badges-group">
          <span className={`task-priority-badge ${priorityClass}`}>
            {task.priority}
          </span>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Task Context or notes */}
      {task.context && <p className="task-context-text">{task.context}</p>}

      {/* Footer: Owner and Deadline */}
      <div className="task-meta-footer">
        <div className="task-meta-item">
          <User className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span className="task-owner-name">{task.owner}</span>
        </div>

        <div className="task-meta-item">
          <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span className="task-deadline-text">{task.deadline}</span>
        </div>
      </div>
    </div>
  );
}
