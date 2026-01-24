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

- **Svelte 5** with runes (`$state`, `$props`, `$derived`) for reactivity
- **SvelteKit 2.49** with adapter-auto
- **Vite 7** + **Tailwind CSS 4**
- **ExcelJS 4.4** for client-side Excel parsing and generation/export
- **IndexedDB** for client-side file history persistence (max 20 entries)
- JavaScript with JSDoc type annotations (strict mode in jsconfig.json)

## Architecture

```
src/
├── routes/
│   ├── +layout.svelte          # Root layout with favicon
│   └── +page.svelte            # Main page (renders UnifiedAnalyzer)
│
├── lib/
│   ├── components/
│   │   ├── UnifiedAnalyzer.svelte      # Main component (file upload + analysis orchestration)
│   │   ├── AttendanceResults.svelte    # Attendance analysis display
│   │   ├── SatisfactionResults.svelte  # Satisfaction survey display
│   │   ├── CompletionRateModal.svelte  # Completion rate threshold settings (ESC/backdrop close)
│   │   └── FileHistory.svelte          # File history sidebar with search/delete
│   │
│   ├── db/
│   │   ├── indexeddb.js                # IndexedDB wrapper (MAX_ENTRIES=20)
│   │   └── history-store.svelte.js     # Svelte 5 reactive store for history
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
2. **Parsing**: ExcelJS parses file client-side using `extractSheetData()` helper
   - Finds header row dynamically by searching for hint text (e.g., "성명")
   - Handles ExcelJS Rich Text objects
3. **Analysis**:
   - `attendance-analyzer.js`: Extracts birth dates, gender, region; calculates age groups and attendance rates
   - `satisfaction-analyzer.js`: Maps Korean satisfaction responses to numeric scores (매우 그렇다→5, etc.), dynamically detects column indexes
4. **History Storage**: File content (ArrayBuffer) + analysis results saved to IndexedDB
   - Auto-cleanup when exceeding MAX_ENTRIES (20)
   - Stores: fileName, fileSize, uploadedAt, fileContent, attendanceResult, satisfactionResult, etc.
5. **Re-analysis**: Completion rate changes trigger automatic re-analysis using stored original data
6. **Display**: Results shown in respective components with demographic breakdowns
7. **Export**: ExcelJS generates formatted Excel reports with Blob URLs (cleaned up on unmount)

## Key Domain Concepts

- **Age Groups**: 19세 이하, 20대, 30대, 40대, 50대, 60대 이상
- **Regions**: 14 Korean administrative regions (통진읍, 고촌읍, 김포본동, etc.)
- **Completion Rate**: Subject-specific attendance thresholds for completion tracking
- **File History**: Recent analysis sessions stored in IndexedDB with full file content for instant reload

## Important Implementation Details

- **Reactivity**: Uses Svelte 5 runes (`$state`, `$props`, `$derived`) - not stores
- **Security**: CSP headers configured in `hooks.server.js` with strict policies
- **Excel Processing**: `extractSheetData()` dynamically finds headers (doesn't assume fixed row numbers)
- **Error Handling**: Auto-dismissing error messages with timeout cleanup
- **Memory Management**: Blob URLs cleaned up on component unmount to prevent memory leaks
