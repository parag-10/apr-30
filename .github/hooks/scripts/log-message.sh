#!/usr/bin/env bash
# Log user messages to a single repo-tracked JSON history file

set -euo pipefail

# Read input from stdin
INPUT=$(cat)

# Create logs directory if it doesn't exist
LOGS_DIR=".github/logs"
mkdir -p "$LOGS_DIR"
LOG_FILE="$LOGS_DIR/copilot-history.json"

make_log_writable() {
  [ -f "$LOG_FILE" ] && chmod u+w "$LOG_FILE" 2>/dev/null || true
}

make_log_readonly() {
  [ -f "$LOG_FILE" ] && chmod a-w "$LOG_FILE" 2>/dev/null || true
}

ensure_log_file() {
  if [ ! -f "$LOG_FILE" ]; then
    jq -n '{ sessions: [] }' > "$LOG_FILE"
  fi
}

make_log_writable
ensure_log_file
trap make_log_readonly EXIT

# Extract session ID
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // ""')
if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

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

PROMPT_COUNT=0
PROMPT_COUNT=$(jq --arg session_id "$SESSION_ID" '[.sessions[] | select(.session.id == $session_id) | .messages[]? | select(.type == "prompt")] | length' "$LOG_FILE" 2>/dev/null || echo "0")
TURN_INDEX=$((PROMPT_COUNT + 1))

# Parse transcript for richer context
COPILOT_VERSION="unknown"
VSCODE_VERSION="unknown"
ATTACHMENTS="[]"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")
  COPILOT_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.copilotVersion // "unknown"')
  VSCODE_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.vscodeVersion // "unknown"')
  ATTACHMENTS=$(echo "$TRANSCRIPT" | jq --argjson prompt_index "$PROMPT_COUNT" '
    ([.[] | select(.type == "user.message")])[$prompt_index].data.attachments // []
  ' 2>/dev/null || echo "[]")
fi

# Create JSON log entry
LOG_ENTRY=$(jq -n \
  --arg session_id "$SESSION_ID" \
  --arg conversation_id "$CONVERSATION_ID" \
  --arg timestamp "$TIMESTAMP" \
  --arg type "prompt" \
  --argjson turn_index "$TURN_INDEX" \
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
    turn_index: $turn_index,
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

# Ensure the session exists and append the prompt entry inside the single history file
jq \
  --arg session_id "$SESSION_ID" \
  --arg started "$TIMESTAMP" \
  --arg username "$USERNAME" \
  --arg email "$USER_EMAIL" \
  --arg project "$WORKSPACE" \
  --arg workspace "$WORKSPACE_PATH" \
  --argjson entry "$LOG_ENTRY" \
  '
    if any(.sessions[]?; .session.id == $session_id) then
      .sessions |= map(
        if .session.id == $session_id then
          .messages += [$entry]
        else
          .
        end
      )
    else
      .sessions += [{
        session: {
          id: $session_id,
          started: $started,
          user: { name: $username, email: $email },
          workspace: { project: $project, path: $workspace }
        },
        messages: [$entry]
      }]
    end
  ' "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Mark this as a legitimate hook write so the pre-commit guard allows it
touch "$(dirname "$LOG_FILE")/.hook-staged"

# Stage the single tracked log file so it appears in git changes
git add "$LOG_FILE" 2>/dev/null || true

# Return success
echo '{"continue": true}'
