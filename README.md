# LeagueHub

**English** | [简体中文](README_zh-CN.md)

LeagueHub is a ready-to-use website template for iRacing leagues. Built with Astro, it generates a static site from your league configuration and iRacing race results. You can publish your own league site without building a page for every race.

The template includes:

- **League home page:** Shows series, recent results, and upcoming races.
- **Sponsors:** Shows configurable sponsor logos and links at the bottom of every page.
- **Series pages:** Show schedules, championship standings, the latest race results, and optional series information.
- **Series documents:** Discover Markdown files and generate reading pages with a table of contents, version, and effective date.
- **Race result pages:** Show race, qualifying, and practice results, including pole position and fastest lap data.
- **Automatic points calculation:** Applies configurable scoring rules and supports position penalties, points deductions, and disqualifications.
- **Multiple series and static builds:** Add a series by adding configuration and data; navigation and pages are generated at build time.

The repository includes fictional examples for a completed series and an upcoming series, so you can preview the site immediately after installing dependencies. To use it for your league, replace the examples and update the site settings, scoring rules, and race data.

## Quick start

Requires Node.js 22.12.0 or later.

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal to see the example site. To set up your league, first edit the site settings in `config/site.ts`. Then use `series/demo-gt3/` or `series/demo-upcoming/` as a starting point for your series configuration and schedule. After a race, add its original iRacing result file and reference it from the corresponding round. The files involved are described below.

Check and build the static site:

```bash
npm run check
npm run build
```

The build output is in `dist/`. Run `npm run preview` to preview the built site locally. `npm run build` also runs the Astro checks before building.

When publishing at a different domain, change only `site` in `astro.config.mjs`. Page canonical URLs, the sitemap, and `robots.txt` use that same address.

The favicon is a separate static image in `public/`. Set its path with `site.favicon` in `config/site.ts` (default: `/favicon.png`). The page links to this path without declaring `type` or `sizes`, leaving image handling to the browser. When changing your branding, replace both the logo and favicon and update their paths. The favicon is copied as-is, without automatic generation or resizing.

## Data and configuration

| Path | Purpose |
| --- | --- |
| `config/site.ts` | Site name, logo, site season, locale, display time zone, accent color, and default table columns |
| `config/sponsors.ts` | Site-wide sponsor names, logos, optional links, and display order |
| `config/points.ts` | Shared scoring rules for finishing positions, pole position, fastest lap, and optional custom bonuses |
| `series/<slug>/config.ts` | Series name, route, scoring system, and optional season name, order, visibility, display overrides, logo, and certificate range |
| `series/<slug>/series.json` | Car class (`carClass`) and ordered schedule (`rounds`) |
| `series/<slug>/info.md` | Optional series introduction and rules, displayed on the site |
| `series/<slug>/documents/*.md` | Optional series documents, automatically generated as standalone display pages |
| `series/<slug>/eventresult-*.json` | Unmodified iRacing race result API responses |
| `series/<slug>/penalties/<roundId>.json` | Optional stewarding decisions for a round |

Each series `config.ts` must export a default configuration with `id`, `name`, `shortName`, `slug`, and `pointsSystem`. The `slug` must match the directory name, and `pointsSystem` must reference a key in `config/points.ts`. Use `display` to override the site-wide table options. Do not enter race result rows manually in the configuration.

In `config/site.ts`, `display.standingsLimit` controls the initial number of championship standings rows and `display.latestResultsLimit` controls the latest race results rows. Both default to `10`. Use a non-negative integer; `0` shows everyone. The series page shows the configured number of rows. Heading links open standalone full standings or race result pages, which always show everyone. Override either setting in a series `config.ts`, for example:

```ts
display: {
  standingsLimit: 15,
  latestResultsLimit: 5,
},
```

Rebuild after changing these settings.

The `custom` points system in `config/points.ts` demonstrates unusual rules: P1–P10 score 32, 24, 18, 14, 12, 10, 8, 6, 4, 2; pole and fastest lap score 1 each; the most improved driver and the driver with the fewest incident points score 1 each; every finisher from P11 onward scores 1. Ties for the two individual bonuses go to the higher official finisher, and a position gain must be positive. Bonuses use official positions after penalties; disqualified drivers score zero. Set `pointsSystem: 'custom'` in a series configuration to use this example.

For other rules, add a points system with a `customBonus(race)` function returning bonuses keyed by driver ID. Return `{ reason: string, points: number }[]` for each awarded driver, for example `{ '12345': [{ reason: 'Most positions gained', points: 1 }, { reason: 'Fewest incident points', points: 1 }] }`. The calculation layer sums and produces the details; pages do not decide eligibility. Omit `customBonus` for systems without custom rewards.

Click a race points total to open a keyboard-accessible dialog (a bottom sheet on phones) with a breakdown showing position points, pole, fastest lap, each custom reward reason, points deductions, and the final total. Bonuses and deductions are shown only when nonzero. Disqualification forces zero points; deductions remain visible but are not applied again. The existing `display.incidents` switch controls “事故” (incident points), representing iRacing `incidents`, rather than a count of accidents. Grid positions and position changes have separate columns. Arrows show changes to official positions after penalties; invalid positions and disqualifications omit movement. The table shows original timing gaps separately from finish status; the header retains its estimated race duration label. Common retirement reasons are translated into Chinese, and unknown reasons retain their original text. Stewarding disqualification reasons remain separate from original result reasons. Pole bonuses use the adapter-provided `poleDriverId`. The race table shows starting positions, and the points breakdown shows pole bonuses; disqualified drivers receive no bonus.

Set `site.timeZone` in `config/site.ts` (for example, `Pacific/Auckland`) to display schedule dates consistently across builds. Keep `date` values in `series.json` as ISO 8601 timestamps with `Z` or an explicit UTC offset. Rebuild the site after changing the configuration.

Set `seasonName` in a series configuration to show it on that series' home page card and series page. If omitted or blank, no season name appears for that series. The home page heading and footer use the independent site-wide season name. Use numeric `order` to sort series on the home page and in navigation, with lower values first. Its default is `0`, and ties use directory path order. Set `visible: false` to remove a series from the home page cards, latest results, upcoming races, and navigation; series are visible by default. Hidden series and result pages are still generated and remain accessible through direct links.

Put series logos in `public/series/` and reference them with a site-root path, such as `logo: '/series/demo-gt3.svg'`. A logo appears in the home page series list and at the top of the series page; if none is configured, text is shown instead. The main navigation always uses text.

The `sponsors` array in `config/sponsors.ts` controls the partner section at the bottom of every page. Each entry needs `name` and `logo`; `url` and numeric `order` are optional (lower values appear first). Put logo files in `public/sponsors/` and reference them with paths such as `/sponsors/example.svg`. Each sponsor uses one logo and the same light gray panel in both site themes. Cards with a URL are clickable; an empty array hides the entire section. Replace the three `DEMO` entries and logos before publishing your league site.

Use `info.md` for the league's purpose, entry requirements, format, cars, prizes, broadcasts, and rules. When the file exists, the series page displays a “Series information” section and a link to it in the page navigation. Scoring rules and other conditions used in calculations must still be defined in structured configuration rather than only in prose.

### Series documents

Keep `info.md` as the introduction on the series page. Put separately shared guides, announcements, or rule descriptions in `series/<slug>/documents/<document-name>.md`; no configuration or manual route registration is needed. For example:

```markdown
---
title: Series reading guide
summary: Where to find the series information.
order: 10
version: "1.0"
effectiveDate: "2026-07-01"
---

## Series information

Write the document here.

### Reading links

Write the section here.
```

`title` is required and must be a nonempty string. `summary`, `version`, and `effectiveDate` are optional nonempty strings. Quote `version` to prevent YAML from interpreting it as a number. `effectiveDate` must be a quoted, valid `YYYY-MM-DD` date; it is displayed as written without time zone conversion and does not schedule publication or affect calculations. `order` is an optional finite number, defaulting to `0`; lower values appear first, with filename order breaking ties. Invalid metadata reports the file path during the build.

The build generates `/racing/<slug>/documents/<document-name>` without the `.md` extension. Use stable lowercase filenames with hyphens where possible. Only `.md` files directly inside `documents/` are discovered. Series with documents display a “赛事文档” navigation link and document list; both are absent when there are no documents. Document pages are generated for hidden series too and remain accessible through direct links.

Document pages share the site's navigation, themes, and footer, display the summary and optional metadata, and link back to the series. Markdown headings automatically form a table of contents using Astro's generated anchors, including unique anchors for repeated headings. Documents without headings omit the contents navigation. Start body headings at `##`, since the page already displays the document title. On phones, contents appear before the body; wide tables and code blocks scroll within their own area.

Documents and `info.md` only display content and do not change points, penalties, or other race calculations. After adding, editing, or deleting documents, run `npm run check` and `npm run build`, then use `npm run preview` to inspect the series page, document links, section anchors, and mobile layout. `series/demo-gt3/documents/` includes a full metadata example and a short announcement.

### Schedule and result files

Each round in `series.json` can reference an original result file in the same directory through `resultFile`. Omit the `.json` extension from the value. For example:

```json
{
  "carClass": "GT3",
  "rounds": [
    {
      "id": "round-1",
      "round": 1,
      "name": "第 1 轮 · Spa-Francorchamps",
      "track": "Spa-Francorchamps",
      "layout": "Grand Prix",
      "date": "2026-07-05T10:00:00Z",
      "resultFile": "eventresult-demo-01"
    }
  ]
}
```

Leave out `resultFile` for rounds that have not taken place. The first scheduled round without a result is treated as the next race. After adding or replacing a result file, rebuild the site to update the official results, standings, series progress, and home page automatically.

### Race position certificates

Set `certificates` in each series `config.ts`:

```ts
certificates: 'off',       // Disabled; also the default when omitted
certificates: { top: 5 },  // Top N finishers, for any positive integer N
certificates: 'all',       // Every driver with an official position
```

The demo GT3 series enables certificates for the top five. Public certificate links appear beneath eligible positions on race result pages only. They open PDFs in a new browser tab, where the browser's PDF viewer can download them. Eligibility uses positions after stewarding; disqualified drivers and drivers without an official position receive no certificate. Certificates use `site.accent`, the series logo when available, and otherwise the site logo. Rebuild after changing results or penalties to update the generated PDFs. The bundled Noto Sans CJK font and its license are in `assets/fonts/`.

### Penalty files

Put stewarding decisions in `series/<slug>/penalties/<roundId>.json` and leave the original result file unchanged. Position drops, points deductions, and disqualifications are supported. See the [penalty file reference](series/penalties.md) for the full JSON format (in Chinese).

Position changes and disqualifications take effect before points are calculated. A disqualified driver scores zero points for that round, including pole position and fastest lap bonuses; their lap times are also excluded from the official fastest lap statistics.

## Managing series

### Add a series

1. Create `series/<slug>/` and use an existing series as a guide for its default-exported `config.ts`. Make sure `slug` matches the directory name. If you need a logo, put it in `public/series/` and reference it from the configuration.
2. Add `series.json` with `carClass` and `rounds`. Add `info.md` if you want an introduction, and `documents/*.md` for standalone documents.
3. Put the original `eventresult-*.json` files for completed races in the series directory and set `resultFile` on the corresponding rounds. Add `penalties/<roundId>.json` files if needed.
4. Run `npm run build` and inspect the generated pages.

`src/lib/data.ts` automatically discovers `series/*/config.ts`; pages also read an optional `info.md` from the same directory, and `src/lib/documents.ts` discovers `documents/*.md`. Navigation, the home page series list, recent results, and upcoming races include visible series, while series pages, document pages, and result pages for completed races are generated for every series during the build.

### Remove or archive a series

Delete its `series/<slug>/` directory or move it outside `series/` to archive it. On the next build, that series disappears from the generated pages, home page, and navigation.

### Included examples

- `series/demo-gt3/`: **DEMO / fictional data** with 20 fictional drivers, 12 simulated rounds, three sessions per round, and separate penalty files. It demonstrates the pages, standings, and penalty workflow and does not represent real races.
- `series/demo-upcoming/`: **DEMO / fictional data** with six scheduled rounds and no results. It demonstrates series progress before the first race, the next race, empty standings, and the upcoming schedule. No result pages or “Race results” page navigation are generated for this series.

## How results are generated

```text
Original iRacing JSON → adapter → penalties → official race results → points → standings
```

`src/lib/iracing-adapter.ts` parses Practice, Qualifying, and Race sessions. Only Race sessions affect penalties, championship points, and official fastest lap statistics. Qualifying results are also used to determine the race pole sitter. Practice and qualifying results do not affect which round is current or which race is next.

The adapter converts iRacing time values from ten-thousandths of a second into display text and milliseconds. It converts valid zero-based positions to one-based positions (`-1` still means no valid position). Race results retain starting and finishing positions, class positions, laps led, status, and the original retirement reason. Timed sessions retain the driver, car number, car, fastest lap, and gap to the session's fastest lap; an invalid lap time is displayed as “—”. Drivers are identified by their iRacing `cust_id`.

`getStaticPaths()` generates pages from the discovered configurations and schedules. The default result route, `/racing/<slug>/results/<roundId>`, shows the race. When the corresponding session data exists, `/qualifying` and `/practice` subpages are also generated. The three session pages share a header and navigation; the race table also shows starting positions.

The main implementation lives in `src/lib/`: `data.ts` loads data, `penalties.ts` applies penalties, `points.ts` calculates points, and `standings.ts` builds standings. `src/components/` contains shared navigation, cards, tables, and result sections; `src/pages/` defines the home, series, and result routes. Page components do not depend directly on iRacing API fields.
