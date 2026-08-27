import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const batchDirectory = path.join(root, 'research', 'deep', 'batches');
const inventoryDirectory = path.join(
  root,
  'research',
  'batches',
  '2026-08-08-current-cheer-song-inventory',
);
const inventorySummaryPath = path.join(inventoryDirectory, 'inventory.json');
const inventoryTitlesPath = path.join(inventoryDirectory, 'titles.json');
const allowedStatuses = new Set([
  'collecting',
  'needs-review',
  'deep-reviewed',
  'blocked',
]);
const allowedCommentStatuses = new Set([
  'available',
  'available-empty',
  'unavailable',
]);

const errors = [];
let skippedCollecting = 0;
const globalBatchIds = new Map();
const globalItemIds = new Map();
const globalEvidenceIds = new Map();
const globalSampleIds = new Map();
const canonicalOrganizationIdByName = new Map();

function fail(file, message) {
  errors.push(`${path.relative(root, file)}: ${message}`);
}

function requireText(file, value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `${field} must be a non-empty string`);
  }
}

try {
  const [inventorySummary, inventoryTitles] = await Promise.all([
    fs.readFile(inventorySummaryPath, 'utf8').then(JSON.parse),
    fs.readFile(inventoryTitlesPath, 'utf8').then(JSON.parse),
  ]);
  const titleRows = Array.isArray(inventoryTitles.organizations)
    ? inventoryTitles.organizations
    : [];
  const titleRowsByName = new Map(titleRows.map((row) => [row.name, row]));
  for (const row of titleRows) canonicalOrganizationIdByName.set(row.name, row.id);

  for (const row of Array.isArray(inventorySummary.organizations)
    ? inventorySummary.organizations
    : []) {
    const titles = titleRowsByName.get(row.name);
    if (!titles) {
      fail(inventorySummaryPath, `organization ${row.name} is missing from titles.json`);
      continue;
    }
    for (const [summaryField, titlesField] of [
      ['currentSongCount', 'currentTitles'],
      ['uncertainSongCount', 'uncertainTitles'],
      ['existingApprovedSongCount', 'existingApprovedTitles'],
    ]) {
      const expected = Array.isArray(titles[titlesField]) ? titles[titlesField].length : 0;
      if (row[summaryField] !== expected) {
        fail(
          inventorySummaryPath,
          `${row.name}.${summaryField} is ${row[summaryField]}; expected ${expected} from titles.json`,
        );
      }
    }
  }

  const count = (rows, field) => rows.reduce(
    (sum, row) => sum + (Array.isArray(row[field]) ? row[field].length : 0),
    0,
  );
  const kboRows = titleRows.filter((row) => row.type === 'kbo');
  const universityRows = titleRows.filter((row) => row.type === 'university');
  const expectedSummary = {
    kboOrganizationsComplete: kboRows.length,
    kboCurrentSongs: count(kboRows, 'currentTitles'),
    kboUncertainSongs: count(kboRows, 'uncertainTitles'),
    kboExistingApprovedSongs: count(kboRows, 'existingApprovedTitles'),
    universityReviewRows: universityRows.length,
    universityRowsWithCurrentSongs: universityRows.filter((row) => row.currentTitles?.length > 0).length,
    universityRowsWithoutConfirmedSongs: universityRows.filter((row) => !row.currentTitles?.length).length,
    universityCurrentSongs: count(universityRows, 'currentTitles'),
    universityUncertainSongs: count(universityRows, 'uncertainTitles'),
    universityExistingApprovedSongs: count(universityRows, 'existingApprovedTitles'),
  };
  expectedSummary.kboNewCurrentCandidates =
    expectedSummary.kboCurrentSongs - expectedSummary.kboExistingApprovedSongs;
  expectedSummary.universityNewCurrentCandidates =
    expectedSummary.universityCurrentSongs - expectedSummary.universityExistingApprovedSongs;
  expectedSummary.combinedCurrentSongs =
    expectedSummary.kboCurrentSongs + expectedSummary.universityCurrentSongs;
  expectedSummary.combinedUncertainSongs =
    expectedSummary.kboUncertainSongs + expectedSummary.universityUncertainSongs;
  expectedSummary.combinedExistingApprovedSongs =
    expectedSummary.kboExistingApprovedSongs + expectedSummary.universityExistingApprovedSongs;
  expectedSummary.combinedNewCurrentCandidates =
    expectedSummary.combinedCurrentSongs - expectedSummary.combinedExistingApprovedSongs;

  for (const [field, expected] of Object.entries(expectedSummary)) {
    if (inventorySummary.summary?.[field] !== expected) {
      fail(
        inventorySummaryPath,
        `summary.${field} is ${inventorySummary.summary?.[field]}; expected ${expected} from titles.json`,
      );
    }
  }
} catch (error) {
  fail(inventorySummaryPath, `cannot validate inventory against titles.json: ${error.message}`);
}

let names = [];
try {
  names = (await fs.readdir(batchDirectory))
    .filter((name) => name.endsWith('.json'))
    .sort();
} catch (error) {
  fail(batchDirectory, `cannot read batch directory: ${error.message}`);
}

for (const name of names) {
  const file = path.join(batchDirectory, name);
  let batch;

  try {
    batch = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
    continue;
  }

  if (batch.schemaVersion !== 1) fail(file, 'schemaVersion must be 1');
  if (!allowedStatuses.has(batch.status)) {
    fail(file, `unknown status ${JSON.stringify(batch.status)}`);
  }
  requireText(file, batch.batchId, 'batchId');
  requireText(file, batch.checkedAt, 'checkedAt');
  requireText(file, batch.organization?.id, 'organization.id');
  requireText(file, batch.organization?.name, 'organization.name');
  requireText(file, batch.rightsNote, 'rightsNote');
  const canonicalOrganizationId = canonicalOrganizationIdByName.get(batch.organization?.name);
  if (!canonicalOrganizationId) {
    fail(file, `organization ${batch.organization?.name} is missing from titles.json`);
  } else if (batch.organization?.id !== canonicalOrganizationId) {
    fail(
      file,
      `organization.id is ${batch.organization?.id}; expected ${canonicalOrganizationId} from titles.json`,
    );
  }
  if (globalBatchIds.has(batch.batchId)) {
    fail(file, `batchId ${batch.batchId} is also used by ${globalBatchIds.get(batch.batchId)}`);
  } else {
    globalBatchIds.set(batch.batchId, path.relative(root, file));
  }

  if (batch.status === 'collecting') {
    skippedCollecting += 1;
    continue;
  }

  const items = Array.isArray(batch.items) ? batch.items : [];
  const evidence = Array.isArray(batch.evidence) ? batch.evidence : [];
  const samples = Array.isArray(batch.youtubeSamples) ? batch.youtubeSamples : [];

  if (items.length === 0 || items.length > 5) {
    fail(file, `items must contain 1-5 songs, found ${items.length}`);
  }

  const itemIds = new Set();
  for (const item of items) {
    requireText(file, item.id, 'items[].id');
    requireText(file, item.title, `item ${item.id ?? '?'} title`);
    requireText(file, item.currentStatus, `${item.id ?? '?'}.currentStatus`);
    requireText(file, item.summary, `${item.id ?? '?'}.summary`);
    if (itemIds.has(item.id)) fail(file, `duplicate item id ${item.id}`);
    itemIds.add(item.id);
    if (globalItemIds.has(item.id)) {
      fail(file, `item id ${item.id} is also used by ${globalItemIds.get(item.id)}`);
    } else {
      globalItemIds.set(item.id, path.relative(root, file));
    }
    if (!Array.isArray(item.aliases)) {
      fail(file, `${item.id}.aliases must be an array`);
    }
    if (!Array.isArray(item.claims) || item.claims.length < 2) {
      fail(file, `${item.id}.claims must contain at least two researched claims`);
    }
    if (!Array.isArray(item.usageContexts) || item.usageContexts.length === 0) {
      fail(file, `${item.id}.usageContexts must not be empty`);
    }
    if (!Array.isArray(item.trivia) || item.trivia.length === 0) {
      fail(file, `${item.id}.trivia must not be empty`);
    }
    if (!Array.isArray(item.unresolved)) {
      fail(file, `${item.id}.unresolved must be an array`);
    }
    if (item.lyrics?.fullTextStored !== false) {
      fail(file, `${item.id}.lyrics.fullTextStored must be false`);
    }
    requireText(file, item.lyrics?.rightsStatus, `${item.id}.lyrics.rightsStatus`);
    requireText(file, item.lyrics?.structureSummary, `${item.id}.lyrics.structureSummary`);
    if (!Array.isArray(item.lyrics?.sourceUrls) || item.lyrics.sourceUrls.length === 0) {
      fail(file, `${item.id}.lyrics.sourceUrls must not be empty`);
    }
    if (item.lyrics?.shortExcerpt != null) {
      const words = String(item.lyrics.shortExcerpt).trim().split(/\s+/u).filter(Boolean);
      if (words.length > 10) fail(file, `${item.id}.lyrics.shortExcerpt exceeds 10 words`);
    }
  }

  const evidenceIds = new Set();
  for (const entry of evidence) {
    requireText(file, entry.id, 'evidence[].id');
    requireText(file, entry.url, `evidence ${entry.id ?? '?'} url`);
    requireText(file, entry.summary, `evidence ${entry.id ?? '?'} summary`);
    if (evidenceIds.has(entry.id)) fail(file, `duplicate evidence id ${entry.id}`);
    evidenceIds.add(entry.id);
    if (globalEvidenceIds.has(entry.id)) {
      fail(file, `evidence id ${entry.id} is also used by ${globalEvidenceIds.get(entry.id)}`);
    } else {
      globalEvidenceIds.set(entry.id, path.relative(root, file));
    }
  }

  const sampleIds = new Set();
  for (const sample of samples) {
    requireText(file, sample.id, 'youtubeSamples[].id');
    requireText(file, sample.songId, `sample ${sample.id ?? '?'} songId`);
    requireText(file, sample.url, `sample ${sample.id ?? '?'} url`);
    requireText(file, sample.videoId, `sample ${sample.id ?? '?'} videoId`);
    requireText(file, sample.title, `sample ${sample.id ?? '?'} title`);
    requireText(file, sample.channel, `sample ${sample.id ?? '?'} channel`);
    requireText(file, sample.publishedAt, `sample ${sample.id ?? '?'} publishedAt`);
    requireText(file, sample.descriptionSummary, `sample ${sample.id ?? '?'} descriptionSummary`);
    if (typeof sample.descriptionSummary === 'string' && sample.descriptionSummary.length > 600) {
      fail(file, `${sample.id}.descriptionSummary exceeds 600 characters; summarize instead of copying`);
    }
    requireText(file, sample.commentsStatus, `sample ${sample.id ?? '?'} commentsStatus`);
    requireText(file, sample.accessedAt, `sample ${sample.id ?? '?'} accessedAt`);
    if (!Array.isArray(sample.supports) || sample.supports.length === 0) {
      fail(file, `${sample.id}.supports must be a non-empty array`);
    } else {
      const hasCanonicalContextTag = sample.supports.includes('contextOnly');
      const hasNonDirectMarker = sample.supports.some((support) =>
        /(?:^|[-_])context[-_]?only$/iu.test(String(support)) ||
        ['sourceSongReferenceOnly', 'rightsReferenceOnly'].includes(String(support)),
      );
      if (hasNonDirectMarker && !hasCanonicalContextTag) {
        fail(file, `${sample.id}.supports must include contextOnly for a non-direct sample`);
      }
    }
    if (!allowedCommentStatuses.has(sample.commentsStatus)) {
      fail(file, `${sample.id}.commentsStatus has an unknown value ${JSON.stringify(sample.commentsStatus)}`);
    }
    if (!Array.isArray(sample.commentSummary)) {
      fail(file, `${sample.id}.commentSummary must be an array`);
    } else if (sample.commentsStatus === 'available' && sample.commentSummary.length === 0) {
      fail(file, `${sample.id}.commentSummary is empty despite available comments`);
    } else if (sample.commentsStatus !== 'available' && sample.commentSummary.length > 0) {
      fail(file, `${sample.id}.commentSummary must be empty when comments are not available`);
    } else if (sample.commentSummary.some((summary) => typeof summary !== 'string' || summary.length > 500)) {
      fail(file, `${sample.id}.commentSummary must contain concise strings of 500 characters or fewer`);
    }
    if (!itemIds.has(sample.songId)) {
      fail(file, `${sample.id}.songId references missing item ${sample.songId}`);
    }
    if (sampleIds.has(sample.id)) fail(file, `duplicate sample id ${sample.id}`);
    sampleIds.add(sample.id);
    if (globalSampleIds.has(sample.id)) {
      fail(file, `sample id ${sample.id} is also used by ${globalSampleIds.get(sample.id)}`);
    } else {
      globalSampleIds.set(sample.id, path.relative(root, file));
    }
    try {
      const parsedUrl = new URL(sample.url);
      let urlVideoId = null;
      if (parsedUrl.hostname === 'youtu.be') {
        urlVideoId = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null;
      } else if (parsedUrl.hostname.endsWith('youtube.com')) {
        urlVideoId = parsedUrl.searchParams.get('v');
        if (!urlVideoId) {
          const segments = parsedUrl.pathname.split('/').filter(Boolean);
          if (['embed', 'shorts', 'live'].includes(segments[0])) urlVideoId = segments[1] ?? null;
        }
      }
      if (urlVideoId && urlVideoId !== sample.videoId) {
        fail(file, `${sample.id}.videoId ${sample.videoId} does not match URL video ID ${urlVideoId}`);
      }
    } catch {
      fail(file, `${sample.id}.url is not a valid URL`);
    }
  }

  const sourceIds = new Set([...evidenceIds, ...sampleIds]);
  let songsMeetingMinimum = 0;
  let openIssueCount = 0;

  for (const item of items) {
    const refs = Array.isArray(item.youtubeSampleRefs) ? item.youtubeSampleRefs : [];
    const resolved = refs.map((ref) => samples.find((sample) => sample.id === ref));
    const urls = new Set(resolved.filter(Boolean).map((sample) => sample.url));
    const videoIds = new Set(resolved.filter(Boolean).map((sample) => sample.videoId));
    if (resolved.some((sample) => !sample)) {
      fail(file, `${item.id} has a missing YouTube sample reference`);
    }
    if (resolved.some((sample) => sample?.songId !== item.id)) {
      fail(file, `${item.id} references a sample assigned to another song`);
    }
    if (urls.size < 5 || videoIds.size < 5) {
      fail(file, `${item.id} has only ${urls.size} distinct YouTube URLs and ${videoIds.size} distinct video IDs`);
    } else {
      songsMeetingMinimum += 1;
    }

    for (const claim of Array.isArray(item.claims) ? item.claims : []) {
      for (const ref of Array.isArray(claim.evidenceRefs) ? claim.evidenceRefs : []) {
        if (!sourceIds.has(ref)) fail(file, `${item.id} claim references missing source ${ref}`);
      }
    }
    for (const trivia of Array.isArray(item.trivia) ? item.trivia : []) {
      for (const ref of Array.isArray(trivia.evidenceRefs) ? trivia.evidenceRefs : []) {
        if (!sourceIds.has(ref)) fail(file, `${item.id} trivia references missing source ${ref}`);
      }
    }

    openIssueCount += Array.isArray(item.unresolved) ? item.unresolved.length : 0;
  }

  const coverage = batch.coverage ?? {};
  if (coverage.requiredYoutubeSamplesPerSong !== 5) {
    fail(file, 'coverage.requiredYoutubeSamplesPerSong must be 5');
  }
  if (coverage.songCount !== items.length) {
    fail(file, `coverage.songCount is ${coverage.songCount}; expected ${items.length}`);
  }
  if (coverage.youtubeSampleCount !== samples.length) {
    fail(file, `coverage.youtubeSampleCount is ${coverage.youtubeSampleCount}; expected ${samples.length}`);
  }
  if (coverage.songsMeetingYoutubeMinimum !== songsMeetingMinimum) {
    fail(file, `coverage.songsMeetingYoutubeMinimum is ${coverage.songsMeetingYoutubeMinimum}; expected ${songsMeetingMinimum}`);
  }
  if (coverage.openIssueCount !== openIssueCount) {
    fail(file, `coverage.openIssueCount is ${coverage.openIssueCount}; expected ${openIssueCount}`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${names.length - skippedCollecting} deep-research batch file(s); skipped ${skippedCollecting} collecting draft(s).`,
  );
}
