/**
 * Formatting and styling helper utilities for Mira Event Command Center
 */

export function getStatusStyle(status) {
  const normalized = (status || "").toLowerCase();
  
  if (normalized.includes("live") || normalized.includes("in progress") || normalized.includes("active") || normalized.includes("done")) {
    return {
      badgeClass: "badge-success",
      label: status,
      dotClass: "dot-success",
    };
  }
  
  if (normalized.includes("up next") || normalized.includes("warning") || normalized.includes("mitigating") || normalized.includes("monitoring")) {
    return {
      badgeClass: "badge-warning",
      label: status,
      dotClass: "dot-warning",
    };
  }

  if (normalized.includes("critical") || normalized.includes("blocked") || normalized.includes("high") || normalized.includes("maintenance")) {
    return {
      badgeClass: "badge-danger",
      label: status,
      dotClass: "dot-danger",
    };
  }

  return {
    badgeClass: "badge-neutral",
    label: status || "Scheduled",
    dotClass: "dot-neutral",
  };
}

export function getPriorityStyle(priority) {
  const normalized = (priority || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "badge-danger";
  }
  if (normalized === "medium") {
    return "badge-warning";
  }
  return "badge-neutral";
}

export function getSeverityStyle(severity) {
  const normalized = (severity || "").toLowerCase();
  if (normalized === "critical") {
    return {
      badgeClass: "badge-danger",
      borderClass: "border-danger",
      glowClass: "glow-danger",
    };
  }
  if (normalized === "high") {
    return {
      badgeClass: "badge-danger",
      borderClass: "border-danger",
      glowClass: "",
    };
  }
  if (normalized === "medium") {
    return {
      badgeClass: "badge-warning",
      borderClass: "border-warning",
      glowClass: "",
    };
  }
  return {
    badgeClass: "badge-neutral",
    borderClass: "border-neutral",
    glowClass: "",
  };
}
