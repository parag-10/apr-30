#!/usr/bin/env bash
# Log user prompts to the Copilot history file

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

USER_MESSAGE=$(echo "$INPUT" | jq -r '.prompt // "No message"')
CWD=$(echo "$INPUT" | jq -r '.cwd // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

USERNAME=$(whoami)
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown@localhost")
WORKSPACE=$(basename "$CWD" 2>/dev/null || echo "unknown")

# Turn index = number of existing turns in this session + 1
TURN_COUNT=$(jq --arg sid "$SESSION_ID" '
  ([ .sessions[] | select(.id == $sid) ] | first | .turns | length) // 0
' "$LOG_FILE" 2>/dev/null || echo "0")
TURN_INDEX=$((TURN_COUNT + 1))

# Get attachments (file names only) from transcript
ATTACHMENTS="[]"
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")
  PROMPT_INDEX=$((TURN_INDEX - 1))
  ATTACHMENTS=$(echo "$TRANSCRIPT" | jq --argjson idx "$PROMPT_INDEX" '
    ([.[] | select(.type == "user.message")])[$idx].data.attachments // []
    | map(.uri // .name // .) | map(split("/") | last)
  ' 2>/dev/null || echo "[]")
fi

# Build turn entry — attachments only included if non-empty
TURN_ENTRY=$(jq -n \
  --argjson turn "$TURN_INDEX" \
  --arg at "$TIMESTAMP" \
  --arg prompt "$USER_MESSAGE" \
  --argjson attachments "$ATTACHMENTS" \
  '{turn: $turn, at: $at, prompt: $prompt} +
   (if ($attachments | length) > 0 then {attachments: $attachments} else {} end)')

# Append turn to existing session, or create a new session entry
jq \
  --arg sid "$SESSION_ID" \
  --arg started "$TIMESTAMP" \
  --arg user "$USERNAME <$USER_EMAIL>" \
  --arg project "$WORKSPACE" \
  --argjson entry "$TURN_ENTRY" \
  '
    if any(.sessions[]?; .id == $sid) then
      .sessions |= map(
        if .id == $sid then .turns += [$entry] else . end
      )
    else
      .sessions += [{
        id: $sid,
        started: $started,
        user: $user,
        project: $project,
        turns: [$entry]
      }]
    end
  ' "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Mark as legitimate hook write and stage
touch "$(dirname "$LOG_FILE")/.hook-staged"
git add "$LOG_FILE" 2>/dev/null || true

echo '{"continue": true}'
