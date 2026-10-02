import React, { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import TaskItem from "../components/dashboard/TaskItem";
import { getTasks } from "../services/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    getTasks().then(setTasks).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Task Operations Center"
      code="MOD-TASK"
      subtitle="Execution dispatch, volunteer assignments, follow-ups, and operational resolutions."
      icon={CheckSquare}
      phaseTarget="Phase 2 — Task Kanban & Direct Dispatch"
      statSummary={[
        { count: tasks.length || 31, label: "Total Tasks" },
        { count: "14", label: "Open" },
        { count: "8", label: "In Progress" },
        { count: "7", label: "Completed" },
      ]}
    >
      <div className="tasks-grid-preview">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </PlaceholderPage>
  );
}
