#!/usr/bin/env node

const [command, ...args] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36';

function jsonAfter(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) return null;
  const start = source.indexOf('{', at + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(source.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else Object.values(value).forEach((item) => walk(item, visit));
}

function textOf(value) {
  if (!value) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((run) => run.text || '').join('');
  return '';
}

function findContinuation(data) {
  let token = null;
  walk(data, (node) => {
    if (token) return;
    const item = node.continuationItemRenderer;
    const ep = item?.continuationEndpoint?.continuationCommand?.token;
    const target = item?.continuationEndpoint?.commandMetadata?.webCommandMetadata?.apiUrl || '';
    if (ep && target.includes('/next')) token = ep;
  });
  return token;
}

function parseComments(data) {
  const comments = [];
  walk(data, (node) => {
    const renderer = node.commentRenderer;
    const entity = node.commentEntityPayload;
    const body = renderer
      ? textOf(renderer.contentText).trim()
      : String(entity?.properties?.content?.content || '').trim();
    if (body && !comments.includes(body)) comments.push(body);
  });
  return comments;
}

async function getHtml(url) {
  const response = await fetch(url, {headers: {'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7'}});
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function video(videoId) {
  const html = await getHtml(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=ko&gl=KR`);
  const player = jsonAfter(html, 'ytInitialPlayerResponse =') || jsonAfter(html, 'ytInitialPlayerResponse=');
  const initial = jsonAfter(html, 'ytInitialData =') || jsonAfter(html, 'ytInitialData=');
  if (!player?.videoDetails) throw new Error(`No player response for ${videoId}`);
  const details = player.videoDetails;
  const micro = player.microformat?.playerMicroformatRenderer || {};
  let comments = parseComments(initial);
  let commentsStatus = 'unavailable';
  const token = findContinuation(initial);
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20260801.00.00';
  if (comments.length) commentsStatus = 'available';
  else if (token && key) {
    const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${key}`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9'},
      body: JSON.stringify({context: {client: {clientName: 'WEB', clientVersion, hl: 'ko', gl: 'KR'}}, continuation: token})
    });
    if (response.ok) {
      const next = await response.json();
      comments = parseComments(next);
      commentsStatus = comments.length ? 'available' : 'available-empty';
    }
  }
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: details.title,
    channel: details.author,
    publishedAt: micro.publishDate || micro.uploadDate || '',
    lengthSeconds: details.lengthSeconds || '',
    description: details.shortDescription || '',
    commentsStatus,
    comments: comments.slice(0, 80)
  };
}

async function search(query) {
  const html = await getHtml(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ko&gl=KR`);
  const initial = jsonAfter(html, 'ytInitialData =') || jsonAfter(html, 'ytInitialData=');
  const results = [];
  walk(initial, (node) => {
    const renderer = node.videoRenderer;
    if (!renderer?.videoId || results.some((item) => item.videoId === renderer.videoId)) return;
    results.push({
      videoId: renderer.videoId,
      title: textOf(renderer.title),
      channel: textOf(renderer.ownerText),
      publishedTimeText: textOf(renderer.publishedTimeText),
      lengthText: textOf(renderer.lengthText),
      viewCountText: textOf(renderer.viewCountText)
    });
  });
  return results;
}

if (command === 'video') console.log(JSON.stringify(await video(args[0]), null, 2));
else if (command === 'videos') {
  for (const id of args) {
    try { console.log(JSON.stringify(await video(id))); }
    catch (error) { console.error(JSON.stringify({videoId: id, error: error.message})); }
  }
} else if (command === 'search') console.log(JSON.stringify(await search(args.join(' ')), null, 2));
else {
  console.error('usage: .tmp-youtube.mjs search <query> | video <id> | videos <id...>');
  process.exitCode = 1;
}
