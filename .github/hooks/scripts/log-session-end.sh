#!/usr/bin/env bash
# Log AI responses to a single repo-tracked JSON history file

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

# Extract fields
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // ""')
if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

# Extract cwd and transcript path from payload
CWD=$(echo "$INPUT" | jq -r '.cwd // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

# Derive username
USERNAME=$(whoami)
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown@localhost")

# Extract project info from cwd
WORKSPACE=$(basename "$CWD" 2>/dev/null || echo "unknown")
WORKSPACE_PATH="$CWD"

# Parse transcript for response content, tool calls, and versions
COPILOT_VERSION="unknown"
VSCODE_VERSION="unknown"
AI_RESPONSE=""
TOOL_CALLS="[]"
RESPONSE_COUNT=0
RESPONSE_COUNT=$(jq --arg session_id "$SESSION_ID" '[.sessions[] | select(.session.id == $session_id) | .messages[]? | select(.type == "response")] | length' "$LOG_FILE" 2>/dev/null || echo "0")
TURN_INDEX=$((RESPONSE_COUNT + 1))

# Tools whose args are too large to log (file content, diffs, etc.)
HEAVY_TOOLS='apply_patch|create_file|edit_notebook_file|run_in_terminal|create_new_jupyter_notebook'

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")

  COPILOT_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.copilotVersion // "unknown"')
  VSCODE_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.vscodeVersion // "unknown"')

  USER_INDEXES=$(echo "$TRANSCRIPT" | jq -r 'to_entries[] | select(.value.type == "user.message") | .key' 2>/dev/null || true)
  START_INDEX=$(printf '%s\n' "$USER_INDEXES" | sed -n "$((RESPONSE_COUNT + 1))p")

  if [ -n "$START_INDEX" ]; then
    END_INDEX=$(printf '%s\n' "$USER_INDEXES" | sed -n "$((RESPONSE_COUNT + 2))p")
    if [ -z "$END_INDEX" ]; then
      END_INDEX=$(echo "$TRANSCRIPT" | jq 'length' 2>/dev/null || echo "0")
    fi

    TURN_TRANSCRIPT=$(echo "$TRANSCRIPT" | jq -c --argjson start_index "$START_INDEX" --argjson stop_index "$END_INDEX" '
      [to_entries[] | select(.key >= $start_index and .key < $stop_index) | .value]
    ' 2>/dev/null || echo '[]')
  else
    TURN_TRANSCRIPT=$(echo "$TRANSCRIPT" | jq -c '.' 2>/dev/null || echo '[]')
  fi

  AI_RESPONSE=$(echo "$TURN_TRANSCRIPT" | jq -r '([.[] | select(.type == "assistant.message") | .data.content] | last) // ""' 2>/dev/null || echo "")
  TOOL_CALLS=$(echo "$TURN_TRANSCRIPT" | jq -c --arg heavy "$HEAVY_TOOLS" '
    . as $events |
    [
      $events[] | select(.type == "tool.call") |
      . as $call |
      {
        name: .data.toolName,
        args: (if (.data.toolName | test($heavy)) then null else (.data.arguments | try fromjson catch .) end),
        success: (
          $events
          | map(select(.type == "tool.result" and .data.toolCallId == $call.data.toolCallId))
          | first
          | .data.success // null
        )
      }
    ]
  ' 2>/dev/null || echo '[]')
fi

# Build response log entry
RESPONSE_ENTRY=$(jq -n \
  --arg session_id "$SESSION_ID" \
  --arg conversation_id "$CONVERSATION_ID" \
  --arg timestamp "$TIMESTAMP" \
  --arg type "response" \
  --argjson turn_index "$TURN_INDEX" \
  --arg copilot_version "$COPILOT_VERSION" \
  --arg vscode_version "$VSCODE_VERSION" \
  --arg message "$AI_RESPONSE" \
  --argjson tool_calls "$TOOL_CALLS" \
  '{
    session_id: $session_id,
    conversation_id: $conversation_id,
    timestamp: $timestamp,
    type: $type,
    turn_index: $turn_index,
    versions: {
      copilot: $copilot_version,
      vscode: $vscode_version
    },
    message: $message,
    tool_calls: $tool_calls
  }')

# Append response entry and update session end time inside the single history file
jq \
  --arg session_id "$SESSION_ID" \
  --arg started "$TIMESTAMP" \
  --arg ended "$TIMESTAMP" \
  --arg username "$USERNAME" \
  --arg email "$USER_EMAIL" \
  --arg project "$WORKSPACE" \
  --arg workspace "$WORKSPACE_PATH" \
  --argjson entry "$RESPONSE_ENTRY" \
  '
    if any(.sessions[]?; .session.id == $session_id) then
      .sessions |= map(
        if .session.id == $session_id then
          .messages += [$entry] | .session.ended = $ended
        else
          .
        end
      )
    else
      .sessions += [{
        session: {
          id: $session_id,
          started: $started,
          ended: $ended,
          user: { name: $username, email: $email },
          workspace: { project: $project, path: $workspace }
        },
        messages: [$entry]
      }]
    end
  ' "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Mark this as a legitimate hook write so the pre-commit guard allows it
touch "$(dirname "$LOG_FILE")/.hook-staged"

# Stage the single tracked log file so it appears in git changes for the user to commit
git add "$LOG_FILE" 2>/dev/null || true

# Return success
echo '{"continue": true}'
