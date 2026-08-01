# Recommendations

Ruckus uses an explainable hybrid event feed. The deterministic stage is always
available and remains the production fallback when aggregate or embedding features are
disabled.

## Eligibility and ranking

The database filters before scoring. A signed-in member receives only published,
unrestricted events at their verified campus with a compatible visibility level. It
excludes confirmed events, passed events, time conflicts, events from blocked hosts,
and private events. Precise location is never a ranking input.

The deterministic score is server-only. It combines interests, previously checked-in
categories, followed hosts and organizations, privacy-eligible friends attending,
freshness, smoothed popularity, remaining capacity, organizer verification, time,
repetition suppression, exploration, and category diversity. The client receives
plain-language reasons such as “A friend is going” or “Matches your music interests,”
never the numeric weights. Keyset state is carried in an opaque versioned cursor.

## Interaction stream and retention

`recommendation_interactions` stores only the member, campus, event or organization,
interaction kind, product surface, timestamps, and an idempotency key. It has no field
for message text, reports, location, private profile attributes, or analytics payloads.
Rows expire after 400 days and `cleanup_recommendation_data` removes expired batches.

Client-recordable interactions are limited to details opened, shared, and invited
friend. Impressions use a bounded batch RPC. Pass, save, RSVP, cancellation, and
check-in outcomes are captured by trusted database triggers so clients cannot forge
strong success signals. Direct table reads and writes are denied.

## Collaborative stage

`refresh_event_collaborative_signals` aggregates recent positive interactions into
event-to-event signals. Every stored pair requires at least five distinct members;
smaller cohorts are rejected by both the refresh query and a table constraint. Signals
expire after eight days and are ignored unless the campus feature flag enables them.
Attendance—not clicks—is the strongest available positive signal.

## Embedding stage

Embeddings are disabled by default. The repository includes:

- a provider interface accepting only event title, description, category, tags, and
  organization name;
- a versioned, digest-keyed background job table;
- per-campus provider, model, and daily job limits;
- a re-embedding strategy based on content-digest changes;
- a cron-protected maintenance function that queues nothing without an enabled
  provider.

No paid provider adapter or credential is configured. Chat, reports, precise location,
private profiles, and inferred sensitive traits are prohibited inputs. A vector index
will be introduced only with a reviewed provider adapter and storage design; the
current app does not require one.

## Evaluation

Run the deterministic fixture:

```sh
npm run test:recommendations
```

Run the evaluator on a privacy-reviewed export:

```sh
node scripts/evaluate-recommendations.mjs /path/to/evaluation.json
```

The harness reports join conversion, check-in conversion, diversity, novelty,
repetition, coverage, cold-start performance, friends-attending effect, organizer
concentration, and campus concentration. Inputs use opaque identifiers and contain no
message or report content. Evaluation is diagnostic; it does not automatically change
production weights.

## Operations

Invoke `recommendation-maintenance` only through the scheduler using the same
`CRON_SECRET` header contract as other internal jobs. Run collaborative refresh and
retention cleanup at least daily. Alert on repeated maintenance failures, queue growth,
or an unexpected change from `embeddingProvider: "disabled"`. Enabling an embedding
provider requires explicit approval, credentials in hosted secrets, a cost ceiling,
and updated tests and documentation.
