#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(
  ROOT,
  process.argv[2] || "reports/game-jam/source-snapshot.json",
);

const FIXED_SOURCES = [
  {
    name: "itch.io upcoming starting soon",
    source: "itch.io",
    url: "https://itch.io/jams/upcoming/sort-date",
    status: "upcoming",
    parser: "itch",
  },
  {
    name: "itch.io upcoming most joined",
    source: "itch.io",
    url: "https://itch.io/jams/upcoming",
    status: "upcoming",
    parser: "itch",
  },
  {
    name: "itch.io starting this week",
    source: "itch.io",
    url: "https://itch.io/jams/starting-this-week",
    status: "upcoming",
    parser: "itch",
  },
  {
    name: "itch.io starting this month",
    source: "itch.io",
    url: "https://itch.io/jams/starting-this-month",
    status: "upcoming",
    parser: "itch",
  },
  {
    name: "itch.io in progress",
    source: "itch.io",
    url: "https://itch.io/jams/in-progress",
    status: "active",
    parser: "itch",
  },
  {
    name: "itch.io in progress most submissions",
    source: "itch.io",
    url: "https://itch.io/jams/in-progress/sort-submissions",
    status: "active",
    parser: "itch",
  },
  {
    name: "itch.io past most submissions",
    source: "itch.io",
    url: "https://itch.io/jams/past/sort-submissions",
    status: "ended",
    parser: "itch",
  },
  {
    name: "Global Game Jam home",
    source: "Global Game Jam",
    url: "https://globalgamejam.org/",
    parser: "generic",
  },
  {
    name: "Global Game Jam 2026 sites",
    source: "Global Game Jam",
    url: "https://globalgamejam.org/jam-sites/2026",
    parser: "generic",
  },
  {
    name: "Ludum Dare",
    source: "Ludum Dare",
    url: "https://ludumdare.com/",
    parser: "generic",
  },
  {
    name: "Indie Game Jams",
    source: "Indie Game Jams",
    url: "https://indiegamejams.com/",
    parser: "generic",
  },
];

function beijingTimestamp(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function toBeijingIso(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return beijingTimestamp(date);
}

function decodeHtml(value) {
  return String(value || "").replace(
    /&(#(\d+)|#x([0-9a-f]+)|[a-z][a-z0-9]+);/gi,
    (entity, body, decimal, hex) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
      const named = {
        amp: "&",
        apos: "'",
        copy: "(c)",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
      };
      return named[body.toLowerCase()] || entity;
    },
  );
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(baseUrl, href) {
  try {
    return new URL(decodeHtml(href), baseUrl).toString();
  } catch {
    return decodeHtml(href);
  }
}

function parseParticipantCount(value) {
  const raw = stripHtml(value).replace(/,/g, "").toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(number * multiplier);
}

function parseItchMetric(segment, label) {
  const statBlocks = [
    ...segment.matchAll(/<(?:div|a)\b[^>]*class=["'][^"']*\bstat\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|a)>/gi),
  ];
  for (const statBlock of statBlocks) {
    const text = stripHtml(statBlock[1]).toLowerCase();
    if (!text.includes(label)) continue;
    const number = statBlock[1].match(/<span\b[^>]*class=["']number["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
    return parseParticipantCount(number || "");
  }

  const fallback = segment.match(
    new RegExp(`<span\\b[^>]*class=["']number["'][^>]*>([\\s\\S]*?)<\\/span>\\s*${label}`, "i"),
  )?.[1];
  return parseParticipantCount(fallback || "");
}

function normalizeSeriesKey(title) {
  const text = stripHtml(title)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(jam|game|games)\b/g, " ")
    .replace(/\bseason\s*\d+\b/g, " ")
    .replace(/\bvol(?:ume)?\.?\s*\d+\b/g, " ")
    .replace(/\bepisode\s*\d+\b/g, " ")
    .replace(/\b\d+(?:st|nd|rd|th)?\b/g, " ")
    .replace(/#[\w-]+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return text || null;
}

function buildQualification(item, previousEditionSubmissions = null) {
  const reasons = [];
  const onlineStatus = item.online_status || "unknown";
  const submittedGamesCount = item.submitted_games_count ?? null;

  if (onlineStatus === "confirmed_online") {
    reasons.push("Public itch.io jam page supports online submissions.");
  }
  if (submittedGamesCount != null) {
    reasons.push(`${submittedGamesCount} submitted games observed from ${item.submission_count_source || item.observed_from}.`);
  }
  if (previousEditionSubmissions != null) {
    reasons.push(`Recent related edition reached ${previousEditionSubmissions} submitted games.`);
  }
  if ((item.participants ?? 0) >= 500) {
    reasons.push(`${item.participants} participants joined before submissions were available.`);
  }

  if (onlineStatus === "confirmed_online" && submittedGamesCount >= 100) {
    return { qualification_status: "confirmed", qualification_reasons: reasons };
  }

  if (
    item.status === "upcoming" &&
    onlineStatus === "confirmed_online" &&
    ((item.participants ?? 0) >= 500 || (previousEditionSubmissions ?? 0) >= 100)
  ) {
    return {
      qualification_status: "watchlist",
      qualification_reasons: reasons.length
        ? reasons
        : ["Upcoming jam has enough influence evidence to monitor before submissions open."],
    };
  }

  if (submittedGamesCount != null && submittedGamesCount < 100) {
    return {
      qualification_status: "rejected",
      qualification_reasons: [...reasons, "Submitted game count is below the 100-game threshold."],
    };
  }

  return {
    qualification_status: "unknown",
    qualification_reasons: reasons.length ? reasons : ["Insufficient evidence for qualification."],
  };
}

function parseDurationMs(duration) {
  const text = String(duration || "").toLowerCase();
  if (/\b(month|months|year|years)\b/.test(text)) {
    return null;
  }

  const units = {
    minute: 60_000,
    minutes: 60_000,
    hour: 3_600_000,
    hours: 3_600_000,
    day: 86_400_000,
    days: 86_400_000,
    week: 604_800_000,
    weeks: 604_800_000,
  };
  let total = 0;
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(minutes?|hours?|days?|weeks?)\b/g)) {
    total += Number(match[1]) * units[match[2]];
  }
  return total > 0 ? total : null;
}

function extractTitle(html) {
  return stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function extractHeadings(html) {
  const headings = [];
  for (const match of html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripHtml(match[2]);
    if (text) headings.push(text);
    if (headings.length >= 20) break;
  }
  return headings;
}

function extractRelevantLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const relevant = /(game\s*jam|jam|schedule|calendar|site|timeline|event|news)/i;

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = absoluteUrl(baseUrl, match[1]);
    const text = stripHtml(match[2]);
    const key = `${href}\n${text}`;
    if (!text || seen.has(key) || !relevant.test(`${href} ${text}`)) continue;
    seen.add(key);
    links.push({ text, url: href });
    if (links.length >= 30) break;
  }

  return links;
}

function parseItchJams(html, sourceConfig) {
  const jams = [];
  const segments = html.split('<div class="jam lazy_images">').slice(1);

  for (const segment of segments) {
    const titleMatch = segment.match(
      /<h3[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i,
    );
    if (!titleMatch) continue;

    const title = stripHtml(titleMatch[2]);
    const url = absoluteUrl(sourceConfig.url, titleMatch[1]);
    const hostBlock = segment.match(/<div class=["']hosted_by meta_row["'][^>]*>([\s\S]*?)<\/div>/i);
    const host = hostBlock
      ? stripHtml(hostBlock[1]).replace(/^Hosted by\s+/i, "") || null
      : null;
    const countdown = segment.match(
      /<span\b[^>]*class=["'][^"']*date_countdown[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );
    const startsUtc = stripHtml(countdown?.[1] || "");
    const startsDate = startsUtc ? new Date(startsUtc) : null;
    const duration = stripHtml(
      segment.match(/<span\b[^>]*class=["'][^"']*date_duration[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ||
        "",
    );
    const durationMs = parseDurationMs(duration);
    const endsDate =
      startsDate && durationMs && !Number.isNaN(startsDate.getTime())
        ? new Date(startsDate.getTime() + durationMs)
        : null;
    const participants = parseItchMetric(segment, "joined");
    const submittedGamesCount = parseItchMetric(segment, "submissions");
    const seriesKey = normalizeSeriesKey(title);

    jams.push({
      title,
      source: "itch.io",
      url,
      starts_at: toBeijingIso(startsDate),
      ends_at: toBeijingIso(endsDate),
      submission_deadline: null,
      status: sourceConfig.status,
      tags: [],
      participants,
      submitted_games_count: submittedGamesCount,
      submission_count_source: submittedGamesCount == null ? null : sourceConfig.url,
      online_status: "confirmed_online",
      online_evidence: "Public itch.io jam page uses itch.io's online jam submission system.",
      qualification_status: "unknown",
      qualification_reasons: [],
      series_key: seriesKey,
      previous_edition_submissions: null,
      host,
      duration: duration || null,
      ranked: /<div class=["']jam_ranked["']/.test(segment),
      featured: /<div class=["']featured_flag["']/.test(segment),
      observed_from: sourceConfig.url,
    });
  }

  return jams;
}

function parseGenericPage(html, sourceConfig) {
  return {
    title: extractTitle(html),
    headings: extractHeadings(html),
    relevant_links: extractRelevantLinks(html, sourceConfig.url),
  };
}

async function fetchSource(sourceConfig) {
  const started = new Date();
  try {
    const response = await fetch(sourceConfig.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (compatible; GameJamNoticeBot/0.1; +https://gamejam-notice.github.io/)",
      },
    });
    const html = await response.text();
    const common = {
      name: sourceConfig.name,
      source: sourceConfig.source,
      url: sourceConfig.url,
      fetched_at: beijingTimestamp(started),
      ok: response.ok,
      status_code: response.status,
      final_url: response.url,
      content_length: html.length,
    };

    if (!response.ok) {
      return {
        ...common,
        error: `HTTP ${response.status}`,
      };
    }

    if (sourceConfig.parser === "itch") {
      return {
        ...common,
        parser: "itch",
        items: parseItchJams(html, sourceConfig),
      };
    }

    return {
      ...common,
      parser: "generic",
      page: parseGenericPage(html, sourceConfig),
    };
  } catch (error) {
    return {
      name: sourceConfig.name,
      source: sourceConfig.source,
      url: sourceConfig.url,
      fetched_at: beijingTimestamp(started),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function mergeNormalizedJams(sources, fetchedAt) {
  const byUrl = new Map();

  for (const source of sources) {
    for (const item of source.items || []) {
      if (!item.url) continue;
      const existing = byUrl.get(item.url);
      if (existing) {
        existing.observed_from = [...new Set([...existing.observed_from, item.observed_from])];
        existing.participants = Math.max(existing.participants || 0, item.participants || 0) || null;
        existing.submitted_games_count =
          Math.max(existing.submitted_games_count || 0, item.submitted_games_count || 0) || null;
        if (!existing.submission_count_source && item.submission_count_source) {
          existing.submission_count_source = item.submission_count_source;
        }
        if (existing.status !== "active" && item.status === "active") existing.status = "active";
        if (existing.status !== "active" && existing.status !== "upcoming" && item.status === "upcoming") {
          existing.status = "upcoming";
        }
        if (!existing.ends_at && item.ends_at) existing.ends_at = item.ends_at;
        if (!existing.series_key && item.series_key) existing.series_key = item.series_key;
        continue;
      }

      byUrl.set(item.url, {
        title: item.title,
        source: item.source,
        url: item.url,
        starts_at: item.starts_at,
        ends_at: item.ends_at,
        submission_deadline: item.submission_deadline,
        status: item.status,
        tags: item.tags,
        participants: item.participants,
        submitted_games_count: item.submitted_games_count,
        submission_count_source: item.submission_count_source,
        online_status: item.online_status,
        online_evidence: item.online_evidence,
        qualification_status: item.qualification_status,
        qualification_reasons: item.qualification_reasons,
        series_key: item.series_key,
        previous_edition_submissions: item.previous_edition_submissions,
        host: item.host,
        discovered_at: fetchedAt,
        last_seen_at: fetchedAt,
        observed_from: [item.observed_from],
        ranked: item.ranked,
        featured: item.featured,
      });
    }
  }

  const pastSubmissionsBySeries = new Map();
  for (const jam of byUrl.values()) {
    if (!jam.series_key || jam.status !== "ended" || !jam.submitted_games_count) continue;
    pastSubmissionsBySeries.set(
      jam.series_key,
      Math.max(pastSubmissionsBySeries.get(jam.series_key) || 0, jam.submitted_games_count),
    );
  }

  for (const jam of byUrl.values()) {
    const previousEditionSubmissions =
      jam.status === "upcoming" && jam.series_key ? pastSubmissionsBySeries.get(jam.series_key) || null : null;
    jam.previous_edition_submissions = previousEditionSubmissions;
    Object.assign(jam, buildQualification(jam, previousEditionSubmissions));
  }

  return [...byUrl.values()].sort((left, right) => {
    const qualificationRank = { confirmed: 0, watchlist: 1, unknown: 2, rejected: 3 };
    const rankDelta =
      (qualificationRank[left.qualification_status] ?? 4) -
      (qualificationRank[right.qualification_status] ?? 4);
    if (rankDelta) return rankDelta;
    const submissionsDelta = (right.submitted_games_count || 0) - (left.submitted_games_count || 0);
    if (submissionsDelta) return submissionsDelta;
    const leftTime = left.starts_at || "";
    const rightTime = right.starts_at || "";
    return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title);
  });
}

async function main() {
  const fetchedAt = beijingTimestamp();
  const sources = [];
  for (const source of FIXED_SOURCES) {
    sources.push(await fetchSource(source));
  }

  const normalizedJams = mergeNormalizedJams(sources, fetchedAt);
  const snapshot = {
    schema_version: 1,
    generated_at: fetchedAt,
    fetched_at: fetchedAt,
    sources,
    normalized_jams: normalizedJams,
    summary: {
      source_count: sources.length,
      failed_source_count: sources.filter((source) => !source.ok).length,
      normalized_jam_count: normalizedJams.length,
    },
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    `Wrote ${path.relative(ROOT, outputPath)} with ${normalizedJams.length} normalized jams from ${sources.length} sources.`,
  );
}

await main();
