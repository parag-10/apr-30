#!/usr/bin/env bash
# Log AI responses to the Copilot history file

set -euo pipefail

INPUT=$(cat)

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

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // ""')
[ -z "$TIMESTAMP" ] && TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

CWD=$(echo "$INPUT" | jq -r '.cwd // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

USERNAME=$(whoami)
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown@localhost")
WORKSPACE=$(basename "$CWD" 2>/dev/null || echo "unknown")

# Turn count = how many turns already have a response (to find correct slice)
RESPONSE_COUNT=$(jq --arg sid "$SESSION_ID" '
  ([ .sessions[] | select(.id == $sid) ] | first | [.turns[] | select(has("response"))] | length) // 0
' "$LOG_FILE" 2>/dev/null || echo "0")

# Tools whose args are too large/noisy to log
HEAVY_TOOLS='apply_patch|create_file|edit_notebook_file|run_in_terminal|create_new_jupyter_notebook'

AI_RESPONSE=""
TOOL_NAMES="[]"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")

  # Find the slice for this turn (between Nth and (N+1)th user.message)
  USER_INDEXES=$(echo "$TRANSCRIPT" | jq -r 'to_entries[] | select(.value.type == "user.message") | .key' 2>/dev/null || true)
  START_INDEX=$(printf '%s\n' "$USER_INDEXES" | sed -n "$((RESPONSE_COUNT + 1))p")

  if [ -n "$START_INDEX" ]; then
    END_INDEX=$(printf '%s\n' "$USER_INDEXES" | sed -n "$((RESPONSE_COUNT + 2))p")
    [ -z "$END_INDEX" ] && END_INDEX=$(echo "$TRANSCRIPT" | jq 'length')

    TURN_TRANSCRIPT=$(echo "$TRANSCRIPT" | jq -c \
      --argjson s "$START_INDEX" --argjson e "$END_INDEX" '
      [to_entries[] | select(.key >= $s and .key < $e) | .value]
    ' 2>/dev/null || echo '[]')
  else
    TURN_TRANSCRIPT=$(echo "$TRANSCRIPT" | jq -c '.' 2>/dev/null || echo '[]')
  fi

  # Last assistant message in this turn
  AI_RESPONSE=$(echo "$TURN_TRANSCRIPT" | jq -r '
    ([.[] | select(.type == "assistant.message") | .data.content] | last) // ""
  ' 2>/dev/null || echo "")

  # Tool names only (no args)
  TOOL_NAMES=$(echo "$TURN_TRANSCRIPT" | jq -c '
    [.[] | select(.type == "tool.call") | .data.toolName] | unique
  ' 2>/dev/null || echo '[]')
fi

# Patch the last turn in this session: add response + tools, update ended
jq \
  --arg sid "$SESSION_ID" \
  --arg ended "$TIMESTAMP" \
  --arg response "$AI_RESPONSE" \
  --argjson tools "$TOOL_NAMES" \
  '
    .sessions |= map(
      if .id == $sid then
        .ended = $ended |
        .turns[-1] += {response: $response} +
          (if ($tools | length) > 0 then {tools: $tools} else {} end)
      else . end
    )
  ' "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Mark as legitimate hook write and stage
touch "$(dirname "$LOG_FILE")/.hook-staged"
git add "$LOG_FILE" 2>/dev/null || true

echo '{"continue": true}'
