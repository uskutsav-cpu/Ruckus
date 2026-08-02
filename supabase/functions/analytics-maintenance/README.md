# Analytics maintenance

Scheduled, service-role maintenance for organizer analytics. The endpoint requires the
shared `CRON_SECRET`, rebuilds deterministic aggregate rows, and removes expired
attribution visits. It never returns raw interaction or attendance records.
