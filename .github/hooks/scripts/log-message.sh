#!/usr/bin/env bash
# Log user messages to per-session files with metadata in JSON format

set -euo pipefail

# Read input from stdin
INPUT=$(cat)

# Create logs directory if it doesn't exist
LOGS_DIR=".github/logs"
mkdir -p "$LOGS_DIR"

# Extract session ID and create session-specific log file
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // ""')
if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi
SESSION_FILE="$LOGS_DIR/copilot-session-${SESSION_ID}.json"

# Extract message and cwd
USER_MESSAGE=$(echo "$INPUT" | jq -r '.prompt // "No message"')
CWD=$(echo "$INPUT" | jq -r '.cwd // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

# Derive username and email
USERNAME=$(whoami)
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown@localhost")

# Extract project name from cwd
WORKSPACE=$(basename "$CWD" 2>/dev/null || echo "unknown")
WORKSPACE_PATH="$CWD"

# Parse transcript for richer context
COPILOT_VERSION="unknown"
VSCODE_VERSION="unknown"
ATTACHMENTS="[]"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")
  COPILOT_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.copilotVersion // "unknown"')
  VSCODE_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.vscodeVersion // "unknown"')
  # Match by content so we get THIS turn's attachments, not a prior turn's
  ATTACHMENTS=$(echo "$TRANSCRIPT" | jq --arg msg "$USER_MESSAGE" '[.[] | select(.type == "user.message" and .data.content == $msg)] | last | .data.attachments // []' 2>/dev/null || echo "[]")
fi

# Create JSON log entry
LOG_ENTRY=$(jq -n \
  --arg session_id "$SESSION_ID" \
  --arg conversation_id "$CONVERSATION_ID" \
  --arg timestamp "$TIMESTAMP" \
  --arg type "prompt" \
  --arg username "$USERNAME" \
  --arg email "$USER_EMAIL" \
  --arg project "$WORKSPACE" \
  --arg workspace "$WORKSPACE_PATH" \
  --arg message "$USER_MESSAGE" \
  --arg copilot_version "$COPILOT_VERSION" \
  --arg vscode_version "$VSCODE_VERSION" \
  --argjson attachments "$ATTACHMENTS" \
  '{
    session_id: $session_id,
    conversation_id: $conversation_id,
    timestamp: $timestamp,
    type: $type,
    user: {
      name: $username,
      email: $email
    },
    workspace: {
      project: $project,
      path: $workspace
    },
    versions: {
      copilot: $copilot_version,
      vscode: $vscode_version
    },
    message: $message,
    context: {
      attachments: $attachments
    }
  }')

# Initialize file with session metadata if it doesn't exist
if [ ! -f "$SESSION_FILE" ]; then
  jq -n \
    --arg id "$SESSION_ID" \
    --arg started "$TIMESTAMP" \
    --arg username "$USERNAME" \
    --arg email "$USER_EMAIL" \
    --arg project "$WORKSPACE" \
    --arg workspace "$WORKSPACE_PATH" \
    '{
      session: {
        id: $id,
        started: $started,
        user: { name: $username, email: $email },
        workspace: { project: $project, path: $workspace }
      },
      messages: []
    }' > "$SESSION_FILE"
fi

# Append message to messages array
jq --argjson entry "$LOG_ENTRY" '.messages += [$entry]' "$SESSION_FILE" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"

# Stage the log so it appears in git changes
git add "$SESSION_FILE" 2>/dev/null || true

# Return success
echo '{"continue": true}'
