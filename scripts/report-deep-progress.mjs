import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inventoryPath = path.join(
  root,
  'research',
  'batches',
  '2026-08-08-current-cheer-song-inventory',
  'titles.json',
);
const batchDirectory = path.join(root, 'research', 'deep', 'batches');

const inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));
const targetByOrganization = new Map(
  inventory.organizations.map((organization) => [
    organization.name,
    organization.currentTitles,
  ]),
);

function normalizeTitle(value) {
  return String(value).normalize('NFC').trim();
}

function titleVariants(value) {
  const exact = normalizeTitle(value);
  const withoutParenthetical = exact.replace(/\s*[（(].*$/u, '').trim();
  const compact = (candidate) => candidate
    .toLocaleLowerCase('ko')
    .replace(/[\s.,!?/:'’"~·_\-]+/gu, '');
  return new Set([
    exact,
    withoutParenthetical,
    compact(exact),
    compact(withoutParenthetical),
  ].filter(Boolean));
}

const progress = new Map();
let totalSamples = 0;
let contextOnlySamples = 0;
const commentStatuses = new Map();
const directSampleShortages = [];

for (const name of (await fs.readdir(batchDirectory)).filter((entry) => entry.endsWith('.json'))) {
  const batch = JSON.parse(await fs.readFile(path.join(batchDirectory, name), 'utf8'));
  const organization = batch.organization.name;
  const row = progress.get(organization) ?? {
    batches: 0,
    completedTargets: new Set(),
    reviewedSongs: new Set(),
    matchedReviewedSongs: new Set(),
    draftedSongs: new Set(),
    samples: 0,
    openIssues: 0,
  };

  row.batches += 1;
  const samplesById = new Map(batch.youtubeSamples.map((sample) => [sample.id, sample]));
  for (const item of batch.items) {
    row.draftedSongs.add(item.id);
    const videoIds = new Set(
      item.youtubeSampleRefs
        .map((sampleId) => samplesById.get(sampleId)?.videoId)
        .filter(Boolean),
    );
    const directVideoIds = new Set(
      item.youtubeSampleRefs
        .map((sampleId) => samplesById.get(sampleId))
        .filter((sample) => sample && !sample.supports?.includes('contextOnly'))
        .map((sample) => sample.videoId),
    );
    if (batch.status !== 'collecting' && directVideoIds.size < 5) {
      directSampleShortages.push({
        organization,
        title: item.title,
        direct: directVideoIds.size,
        total: videoIds.size,
      });
    }
    const meetsMinimum = batch.status !== 'collecting' && videoIds.size >= 5;
    if (meetsMinimum) {
      row.reviewedSongs.add(item.id);
      row.openIssues += Array.isArray(item.unresolved) ? item.unresolved.length : 0;

      const names = new Set(
        [item.title, ...(Array.isArray(item.aliases) ? item.aliases : [])]
          .flatMap((name) => [...titleVariants(name)]),
      );
      const targets = targetByOrganization.get(organization) ?? [];
      for (const target of targets) {
        if ([...titleVariants(target)].some((variant) => names.has(variant))) {
          row.completedTargets.add(target);
          row.matchedReviewedSongs.add(item.id);
        }
      }
    }
  }
  row.samples += batch.youtubeSamples.length;
  progress.set(organization, row);

  totalSamples += batch.youtubeSamples.length;
  for (const sample of batch.youtubeSamples) {
    if (sample.supports?.includes('contextOnly')) contextOnlySamples += 1;
    commentStatuses.set(
      sample.commentsStatus,
      (commentStatuses.get(sample.commentsStatus) ?? 0) + 1,
    );
  }
}

const totalTarget = [...targetByOrganization.values()].reduce((sum, titles) => sum + titles.length, 0);
const totalCompleted = [...progress.values()].reduce(
  (sum, row) => sum + row.completedTargets.size,
  0,
);

console.log(`Deep review: ${totalCompleted}/${totalTarget} songs (${((totalCompleted / totalTarget) * 100).toFixed(1)}%)`);
console.log(`YouTube samples: ${totalSamples}`);
console.log(
  `Context-only samples: ${contextOnlySamples}; songs with fewer than 5 direct samples: ${directSampleShortages.length}`,
);
console.log(
  `Comment status: ${[...commentStatuses.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}=${count}`)
    .join(', ')}`,
);

for (const [organization, row] of [...progress.entries()].sort(([left], [right]) => left.localeCompare(right, 'ko'))) {
  const targets = targetByOrganization.get(organization);
  const target = targets?.length ?? '?';
  const extraReviewed = row.reviewedSongs.size - row.matchedReviewedSongs.size;
  console.log(
    `- ${organization}: ${row.completedTargets.size}/${target} inventory songs complete (${row.reviewedSongs.size} reviewed${extraReviewed > 0 ? `, ${extraReviewed} additional review` : ''}; ${row.draftedSongs.size} drafted), ${row.samples} videos, ${row.openIssues} open issues, ${row.batches} batches`,
  );
}

if (directSampleShortages.length > 0) {
  console.log('Direct-sample shortages (public-source scarcity; context samples are labeled):');
  for (const item of directSampleShortages.sort((left, right) =>
    left.direct - right.direct ||
    left.organization.localeCompare(right.organization, 'ko') ||
    left.title.localeCompare(right.title, 'ko')
  )) {
    console.log(`  - ${item.organization} / ${item.title}: ${item.direct} direct, ${item.total} total`);
  }
}
