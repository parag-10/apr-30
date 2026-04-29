#!/usr/bin/env bash
# Debug script to see what data VS Code sends to hooks

set -euo pipefail

# Read input from stdin
INPUT=$(cat)

# Create logs directory
LOGS_DIR=".github/logs"
mkdir -p "$LOGS_DIR"

# Write raw input to debug file
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEBUG_FILE="$LOGS_DIR/hook-debug.json"

echo "=== Hook Input Captured at $TIMESTAMP ===" >> "$DEBUG_FILE"
echo "$INPUT" | jq '.' >> "$DEBUG_FILE" 2>/dev/null || echo "$INPUT" >> "$DEBUG_FILE"
echo "" >> "$DEBUG_FILE"
echo "Available keys:" >> "$DEBUG_FILE"
echo "$INPUT" | jq 'keys' >> "$DEBUG_FILE" 2>/dev/null || echo "Failed to parse JSON" >> "$DEBUG_FILE"
echo "" >> "$DEBUG_FILE"
echo "=================================" >> "$DEBUG_FILE"
echo "" >> "$DEBUG_FILE"

# Return success
echo '{"continue": true}'
