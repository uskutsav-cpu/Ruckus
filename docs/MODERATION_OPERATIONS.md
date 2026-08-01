# Moderation operations

The `/admin/moderation` route is only surfaced to admin profiles and every queue/update/
action RPC verifies the database role. Knowing the URL is insufficient. Reporters can
submit eligible targets but cannot inspect internal cases.

Severity guidance: S1 low-impact/off-topic; S2 repeated spam/impersonation/scam; S3
harassment, hate, sexual misconduct, stalking, or credible danger; S4 immediate threat,
violence, weapon, or self-harm language. Automation only triages keywords; a human must
review context.

1. Confirm target/context and check prior actions without copying sensitive evidence.
2. Assign the case, record private notes, and escalate S4 to the approved campus/emergency
   process. In-app tooling is not emergency dispatch.
3. Choose the least severe effective action: warning, time-bounded suspension, ban,
   content removal, organization restriction, event cancellation, or dismissal.
4. Confirm the audited action. Never place report descriptions in notifications/logs.
5. Record user-facing outcome outside private notes when the owner’s support workflow
   exists. Preserve evidence only under an approved retention policy.

Appeal intake address, reviewer staffing, campus contacts, response SLAs, evidence
retention, law-enforcement request handling, and legal review remain owner gates.
