"""Notion database identifiers and expected property names."""

from dataclasses import dataclass


@dataclass(frozen=True)
class DatabaseDefinition:
    config_attribute: str
    identity_property: str


DATABASES = {
    "sessions": DatabaseDefinition("sessions_database_id", "Session ID"),
    "tasks": DatabaseDefinition("tasks_database_id", "Task ID"),
    "risks": DatabaseDefinition("risks_database_id", "Risk ID"),
    "changes": DatabaseDefinition("changes_database_id", "Change ID"),
}

PROPERTY_NAMES = {
    "sessions": (
        "Name", "Session ID", "Venue", "Start Time", "End Time", "Speaker", "Status"
    ),
    "tasks": (
        "Title", "Task ID", "Status", "Priority", "Owner", "Due Time", "Source Change"
    ),
    "risks": (
        "Title", "Risk ID", "Severity", "Status", "Description", "Source Change"
    ),
    "changes": (
        "Title", "Change ID", "Entity", "Field", "Old Value", "New Value", "Status",
        "Severity", "Created Time", "AI Recommended Actions",
    ),
}
