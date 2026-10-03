"""Notion database IDs, property contracts, and backend select values."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PropertyDefinition:
    property_type: str
    required_options: tuple[str, ...] = ()


@dataclass(frozen=True)
class DatabaseDefinition:
    config_attribute: str
    identity_property: str
    title_property: str
    properties: dict[str, PropertyDefinition]


DATABASES = {
    "sessions": DatabaseDefinition(
        "sessions_database_id",
        "Session ID",
        "Name",
        {
            "Name": PropertyDefinition("title"),
            "Session ID": PropertyDefinition("rich_text"),
            "Venue": PropertyDefinition("rich_text"),
            "Start Time": PropertyDefinition("date"),
            "End Time": PropertyDefinition("date"),
            "Speaker": PropertyDefinition("rich_text"),
            "Status": PropertyDefinition("select", ("scheduled",)),
        },
    ),
    "tasks": DatabaseDefinition(
        "tasks_database_id",
        "Task ID",
        "Title",
        {
            "Title": PropertyDefinition("title"),
            "Task ID": PropertyDefinition("rich_text"),
            "Status": PropertyDefinition(
                "select", ("open", "todo", "in_progress", "blocked", "done", "cancelled")
            ),
            "Priority": PropertyDefinition("select", ("low", "medium", "high", "critical")),
            "Owner": PropertyDefinition("rich_text"),
            "Due Time": PropertyDefinition("date"),
            "Description": PropertyDefinition("rich_text"),
            "Source Change": PropertyDefinition("rich_text"),
        },
    ),
    "risks": DatabaseDefinition(
        "risks_database_id",
        "Risk ID",
        "Title",
        {
            "Title": PropertyDefinition("title"),
            "Risk ID": PropertyDefinition("rich_text"),
            "Severity": PropertyDefinition("select", ("low", "medium", "high", "critical")),
            "Status": PropertyDefinition(
                "select", ("open", "monitoring", "mitigating", "mitigated", "closed")
            ),
            "Description": PropertyDefinition("rich_text"),
            "Source Change": PropertyDefinition("rich_text"),
        },
    ),
    "changes": DatabaseDefinition(
        "changes_database_id",
        "Change ID",
        "Title",
        {
            "Title": PropertyDefinition("title"),
            "Change ID": PropertyDefinition("rich_text"),
            "Entity": PropertyDefinition("rich_text"),
            "Field": PropertyDefinition("rich_text"),
            "Old Value": PropertyDefinition("rich_text"),
            "New Value": PropertyDefinition("rich_text"),
            "Status": PropertyDefinition("select", ("Recorded",)),
            "Severity": PropertyDefinition("select", ("low", "medium", "high")),
            "Created Time": PropertyDefinition("date"),
            "AI Recommended Actions": PropertyDefinition("rich_text"),
            "Request Status": PropertyDefinition("rich_text"),
            "Reason": PropertyDefinition("rich_text"),
            "Requester": PropertyDefinition("rich_text"),
            "Affected Entities": PropertyDefinition("rich_text"),
            "Impact Summary": PropertyDefinition("rich_text"),
            "Conflicts": PropertyDefinition("rich_text"),
        },
    ),
}

PROPERTY_NAMES = {
    name: tuple(definition.properties)
    for name, definition in DATABASES.items()
}
