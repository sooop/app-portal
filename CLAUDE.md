# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean-language educational analytics web application ("통합 분석 시스템") built with Svelte 5 + SvelteKit. Analyzes attendance and satisfaction survey data from Excel files.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Type checking (svelte-check)
npm run check:watch  # Type checking in watch mode
```

No linting or testing tools are configured.

## Tech Stack

- **Svelte 5** with runes (`$state`, `$props`) for reactivity
- **SvelteKit 2.49** with adapter-auto
- **Vite 7** + **Tailwind CSS 4**
- **XLSX** (CDN) for client-side Excel parsing
- **ExcelJS** for Excel generation/export
- JavaScript with JSDoc type annotations (strict mode in jsconfig.json)

## Architecture

```
src/
├── routes/
│   ├── +layout.svelte          # Root layout
│   └── +page.svelte            # Main page (renders UnifiedAnalyzer)
│
├── lib/
│   ├── components/
│   │   ├── UnifiedAnalyzer.svelte      # Main component (file upload + analysis orchestration)
│   │   ├── AttendanceResults.svelte    # Attendance analysis display
│   │   ├── SatisfactionResults.svelte  # Satisfaction survey display
│   │   └── CompletionRateModal.svelte  # Completion rate threshold settings (ESC/backdrop close)
│   │
│   ├── attendance-analyzer.js          # Attendance data processing logic
│   ├── satisfaction-analyzer.js        # Satisfaction survey processing logic
│   └── icons.js                        # SVG icon definitions
│
├── hooks.server.js             # Security headers (CSP, X-Frame-Options, etc.)
└── app.css                     # Tailwind imports
```

## Data Flow

1. **Excel Upload**: User uploads XLSX/XLS via UnifiedAnalyzer (drag-drop or file select, 50MB limit)
2. **Parsing**: ExcelJS parses file client-side
3. **Analysis**:
   - `attendance-analyzer.js`: Extracts birth dates, gender, region; calculates age groups and attendance rates
   - `satisfaction-analyzer.js`: Maps Korean satisfaction responses to numeric scores (매우 그렇다→5, etc.), dynamically detects column indexes
4. **Re-analysis**: Completion rate changes trigger automatic re-analysis using stored original data
5. **Display**: Results shown in respective components with demographic breakdowns
6. **Export**: ExcelJS generates formatted Excel reports

## Key Domain Concepts

- **Age Groups**: 19세 이하, 20대, 30대, 40대, 50대, 60대 이상
- **Regions**: 14 Korean administrative regions (통진읍, 고촌읍, 김포본동, etc.)
- **Completion Rate**: Subject-specific attendance thresholds for completion tracking
