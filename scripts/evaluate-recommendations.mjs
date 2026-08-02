import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(
  process.argv[2] ?? 'scripts/fixtures/recommendation-evaluation.json'
);
const assertFixture = process.argv.includes('--assert-fixture');
const input = JSON.parse(readFileSync(inputPath, 'utf8'));

if (!Array.isArray(input.interactions) || !Number.isInteger(input.eligibleEventCount)) {
  throw new Error('Evaluation input requires interactions[] and eligibleEventCount.');
}

const rows = input.interactions;
const ratio = (numerator, denominator) =>
  denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
const groupBy = (items, key) => {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    groups.set(value, [...(groups.get(value) ?? []), item]);
  }
  return groups;
};
const maxShare = (groups) =>
  Math.max(0, ...[...groups.values()].map((items) => ratio(items.length, rows.length)));

const joined = rows.filter((row) => row.joined);
const checkedIn = rows.filter((row) => row.checkedIn);
const coldStart = rows.filter((row) => row.coldStart);
const friendSignal = rows.filter((row) => row.friendAttending);
const noFriendSignal = rows.filter((row) => !row.friendAttending);
const slates = groupBy(rows, 'slateId');
const diversity =
  [...slates.values()].reduce(
    (sum, slate) =>
      sum + ratio(new Set(slate.map((row) => row.category)).size, slate.length),
    0
  ) / Math.max(slates.size, 1);

const seen = new Set();
let repetitions = 0;
for (const row of rows) {
  const key = `${row.profileId}:${row.eventId}`;
  if (seen.has(key)) repetitions += 1;
  seen.add(key);
}

const report = {
  impressions: rows.length,
  joinConversion: ratio(joined.length, rows.length),
  checkinConversionFromImpression: ratio(checkedIn.length, rows.length),
  checkinConversionFromJoin: ratio(checkedIn.length, joined.length),
  diversity: Number(diversity.toFixed(4)),
  novelty: ratio(rows.filter((row) => row.novel).length, rows.length),
  repetition: ratio(repetitions, rows.length),
  coverage: ratio(new Set(rows.map((row) => row.eventId)).size, input.eligibleEventCount),
  coldStartJoinConversion: ratio(
    coldStart.filter((row) => row.joined).length,
    coldStart.length
  ),
  friendsAttendingEffect: Number(
    (
      ratio(friendSignal.filter((row) => row.joined).length, friendSignal.length) -
      ratio(noFriendSignal.filter((row) => row.joined).length, noFriendSignal.length)
    ).toFixed(4)
  ),
  organizerConcentration: maxShare(groupBy(rows, 'organizationId')),
  campusConcentration: maxShare(groupBy(rows, 'campusId'))
};

for (const [metric, value] of Object.entries(report)) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Evaluation metric ${metric} is not finite.`);
  }
}

if (assertFixture) {
  const expected = input.expected;
  if (!expected) throw new Error('Fixture assertion requires an expected report.');
  for (const [metric, value] of Object.entries(expected)) {
    if (report[metric] !== value) {
      throw new Error(`Expected ${metric}=${value}, received ${report[metric]}.`);
    }
  }
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
