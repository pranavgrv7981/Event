import React from "react";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";

export function LoadingState({ message = "Retrieving operational telemetry...", dense = false }) {
  return (
    <div className={`state-card-container ${dense ? "dense" : ""}`}>
      <div className="state-spinner-wrapper">
        <div className="tactical-spinner" />
      </div>
      <p className="state-message">{message}</p>
      <span className="state-telemetry-tag">SYSTEM TELEMETRY SYNCHRONIZING</span>
    </div>
  );
}

export function ErrorState({ message = "Failed to synchronize operational stream.", onRetry }) {
  return (
    <div className="state-card-container error">
      <div className="state-icon-circle error">
        <AlertTriangle className="w-6 h-6 text-danger" />
      </div>
      <h3 className="state-title">Telemetry Interrupted</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary state-action-btn" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2 inline" />
          Reconnect Stream
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "No Active Records", message = "All operational queues are currently clear.", icon: Icon = Inbox }) {
  return (
    <div className="state-card-container empty">
      <div className="state-icon-circle neutral">
        <Icon className="w-6 h-6 text-muted" />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
}
