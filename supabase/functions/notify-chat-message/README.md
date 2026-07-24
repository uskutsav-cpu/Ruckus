# notify-chat-message

The sender invokes this after the rate-limited message insert succeeds. The function
re-reads the message through the caller-scoped client, verifies that the caller is the
actual sender, resolves active group members with the service client, applies
server-synced chat notification preferences, and sends a safe deep link.
