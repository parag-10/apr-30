#!/usr/bin/env bash
# Log AI response and session-end data to the per-session JSON file

set -euo pipefail

# Read input from stdin
INPUT=$(cat)

# Create logs directory if it doesn't exist
LOGS_DIR=".github/logs"
mkdir -p "$LOGS_DIR"

# Extract fields
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
CONVERSATION_ID=$(echo "$INPUT" | jq -r '.conversation_id // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // ""')
if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi
SESSION_FILE="$LOGS_DIR/copilot-session-${SESSION_ID}.json"

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

# Tools whose args are too large to log (file content, diffs, etc.)
HEAVY_TOOLS='replace_string_in_file|multi_replace_string_in_file|create_file|insert_edit_into_file|edit_notebook_file|run_in_terminal'

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  TRANSCRIPT=$(jq -s '.' "$TRANSCRIPT_PATH" 2>/dev/null || echo "[]")

  COPILOT_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.copilotVersion // "unknown"')
  VSCODE_VERSION=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "session.start")] | last | .data.vscodeVersion // "unknown"')

  # Last assistant message (final reply — full content preserved)
  AI_RESPONSE=$(echo "$TRANSCRIPT" | jq -r '[.[] | select(.type == "assistant.message")] | last | .data.content // ""')

  # All tool calls — strip args for heavy file-editing tools, keep for others
  TOOL_CALLS=$(echo "$TRANSCRIPT" | jq --arg heavy "$HEAVY_TOOLS" '
    . as $all |
    [.[] | select(.type == "tool.call") |
      . as $call |
      ($call.data.toolName | test($heavy)) as $is_heavy |
      {
        name: .data.toolName,
        args: (if $is_heavy then null else (.data.arguments | try fromjson catch .) end),
        success: ($all | map(select(.type == "tool.result" and .data.toolCallId == $call.data.toolCallId)) | first | .data.success // null)
      }
    ]' 2>/dev/null || echo "[]")
fi

# Build response log entry
RESPONSE_ENTRY=$(jq -n \
  --arg session_id "$SESSION_ID" \
  --arg conversation_id "$CONVERSATION_ID" \
  --arg timestamp "$TIMESTAMP" \
  --arg type "response" \
  --arg copilot_version "$COPILOT_VERSION" \
  --arg vscode_version "$VSCODE_VERSION" \
  --arg message "$AI_RESPONSE" \
  --argjson tool_calls "$TOOL_CALLS" \
  '{
    session_id: $session_id,
    conversation_id: $conversation_id,
    timestamp: $timestamp,
    type: $type,
    versions: {
      copilot: $copilot_version,
      vscode: $vscode_version
    },
    message: $message,
    tool_calls: $tool_calls
  }')

# Initialize file if it doesn't exist (edge case: Stop fires with no prior prompt)
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

# Append response entry and update session end time
jq --argjson entry "$RESPONSE_ENTRY" \
   --arg ended "$TIMESTAMP" \
   '.messages += [$entry] | .session.ended = $ended' \
   "$SESSION_FILE" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"

# Stage logs so they appear in git changes for the user to commit
git add .github/logs/ 2>/dev/null || true

# Return success
echo '{"continue": true}'
