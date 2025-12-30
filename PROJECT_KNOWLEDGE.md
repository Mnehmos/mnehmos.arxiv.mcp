# mnehmos.arxiv.mcp - Knowledge Base Document

## Quick Reference

| Property | Value |
|----------|-------|
| **Repository** | https://github.com/Mnehmos/mnehmos.arxiv.mcp |
| **Primary Language** | TypeScript |
| **Project Type** | MCP Server |
| **Status** | Active |
| **Last Updated** | 2025-12-29 |

## Overview

This project is an MCP (Model Context Protocol) server that provides tools for interacting with the arXiv API to search and retrieve academic papers. It enables AI assistants to search for papers by various criteria (title, author, category, abstract), retrieve detailed paper information, and extract full text content from PDFs with intelligent caching. The server exposes four main tools: search_papers, get_paper, search_by_category, and get_paper_content.

## Architecture

### System Design

This is an MCP server implementation that follows the stdio transport pattern. The server uses the official Model Context Protocol SDK from Anthropic to expose arXiv API functionality as tools that can be called by MCP clients like Claude Desktop. The architecture consists of a single ArxivServer class that handles tool registration, request routing, and communication with the external arXiv API. Data flows through axios HTTP requests to arXiv's REST API, XML response parsing, and JSON formatting for client consumption. PDF downloads are cached locally to avoid redundant network requests.

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| ArxivServer | Main server class implementing MCP protocol and tool handlers | `src/index.ts` |
| Tool Handlers | Four methods implementing search_papers, get_paper, search_by_category, get_paper_content | `src/index.ts` (lines 270-610) |
| XML Parser | Processes raw XML responses from arXiv API into structured JSON | `src/index.ts` (lines 400-483) |
| PDF Handler | Downloads and extracts text from arXiv PDFs with caching | `src/index.ts` (lines 491-610) |
| Configuration | TypeScript build config and dependencies | `tsconfig.json`, `package.json` |
| Tests | Jest test suites for each tool | `test/*.test.ts` |

### Data Flow

```
MCP Client (Claude Desktop)
  → stdio transport
  → ArxivServer.setupToolHandlers()
  → Tool method (searchPapers/getPaper/searchByCategory/getPaperContent)
  → queryArxiv() → axios GET → arXiv API (http://export.arxiv.org/api/query)
  → XML Response → processArxivResponse()
  → JSON structured data
  → MCP Response → Client

PDF Content Flow:
get_paper_content
  → downloadPdf() → Check local cache (temp/pdfs/)
  → If not cached: axios GET → https://arxiv.org/pdf/{id}.pdf
  → Save to cache → extractTextFromPdf() → pdf-parse library
  → Cleaned text content → MCP Response
```

## API Surface

### Public Interfaces

The server exposes four MCP tools that can be called by any MCP client:

#### Tool: `search_papers`
- **Purpose**: Search for papers on arXiv by various criteria with flexible query building
- **Parameters**:
  - `query` (string, optional): General search query across all fields
  - `category` (string, optional): arXiv category (e.g., `cs.AI`, `physics.optics`)
  - `author` (string, optional): Author name to search for
  - `title` (string, optional): Words to search for in the title
  - `abstract` (string, optional): Words to search for in the abstract
  - `start` (number, optional): Starting index for pagination (0-based, default: 0)
  - `max_results` (number, optional): Maximum number of results (max 2000, default: 10)
  - `sort_by` (string, optional): Sort by `relevance`, `lastUpdatedDate`, or `submittedDate`
  - `sort_order` (string, optional): Sort order `ascending` or `descending`
- **Returns**: JSON object with feed_title, total_results, start_index, items_per_page, and papers array containing id, arxiv_id, title, summary, authors, published, updated, categories, links

#### Tool: `get_paper`
- **Purpose**: Get detailed information about a specific paper by its arXiv ID
- **Parameters**:
  - `paper_id` (string, required): arXiv paper ID (e.g., `2104.13478` or `cs/0001001`)
- **Returns**: Same structured JSON format as search_papers but for a single paper

#### Tool: `search_by_category`
- **Purpose**: Search for papers in a specific arXiv category with pagination and sorting
- **Parameters**:
  - `category` (string, required): arXiv category (e.g., `cs.AI`, `physics.optics`)
  - `start` (number, optional): Starting index for pagination (0-based)
  - `max_results` (number, optional): Maximum number of results (max 2000)
  - `sort_by` (string, optional): Sort by `relevance`, `lastUpdatedDate`, or `submittedDate`
  - `sort_order` (string, optional): Sort order `ascending` or `descending`
- **Returns**: Same structured JSON format as search_papers

#### Tool: `get_paper_content`
- **Purpose**: Download and extract full text content from a paper's PDF
- **Parameters**:
  - `paper_id` (string, required): arXiv paper ID (e.g., `2104.13478`)
- **Returns**: Plain text content of the paper extracted from PDF

### Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ARXIV_API_BASE_URL` | string | `http://export.arxiv.org/api/query` | Base URL for arXiv API queries |
| `TEMP_PDF_DIR` | string | `{cwd}/temp/pdfs` | Directory for caching downloaded PDFs |

No environment variables required. The server runs on stdio and does not expose HTTP endpoints.

## Usage Examples

### Basic Usage

```typescript
// MCP Client Configuration (Claude Desktop - claude_desktop_config.json)
{
  "mcpServers": {
    "arxiv": {
      "name": "arxiv-mcp-server",
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "C:/path/to/mnehmos.arxiv.mcp",
      "enabled": true,
      "alwaysAllow": [
        "search_papers",
        "get_paper",
        "search_by_category",
        "get_paper_content"
      ]
    }
  }
}
```

### Advanced Patterns

```typescript
// Example: Building a complex search query programmatically
const searchParams: SearchPapersArgs = {
  query: "machine learning",
  category: "cs.LG",
  author: "Yoshua Bengio",
  start: 0,
  max_results: 50,
  sort_by: "submittedDate",
  sort_order: "descending"
};

// This constructs: search_query=all:machine+learning+AND+cat:cs.LG+AND+au:Yoshua+Bengio
// The server combines all criteria with AND logic and enforces API limits
```

```typescript
// Example: PDF caching logic from src/index.ts
private async downloadPdf(url: string, paperId: string): Promise<string> {
  await fs.ensureDir(TEMP_PDF_DIR);
  const sanitizedPaperId = paperId.replace(/\//g, '_');
  const pdfPath = path.join(TEMP_PDF_DIR, `${sanitizedPaperId}.pdf`);

  // Check cache first to avoid redundant downloads
  if (await fs.pathExists(pdfPath)) {
    console.error(`Using cached PDF for ${paperId}`);
    return pdfPath;
  }

  // Download with timeout and proper headers
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'arXiv-MCP-Server/0.1.0' }
  });

  await fs.outputFile(pdfPath, response.data);
  return pdfPath;
}
```

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | ^1.10.2 | Official MCP SDK for server implementation and transport |
| axios | ^1.9.0 | HTTP client for arXiv API requests and PDF downloads |
| fs-extra | ^11.3.0 | Enhanced filesystem operations for PDF caching |
| pdf-parse | ^1.1.1 | PDF text extraction from downloaded papers |
| typescript | ^5.8.3 | TypeScript language support (also used at runtime) |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @jest/globals | ^29.7.0 | Jest testing framework globals |
| @types/fs-extra | ^11.0.4 | TypeScript definitions for fs-extra |
| @types/jest | ^29.5.12 | TypeScript definitions for Jest |
| @types/node | ^22.15.2 | TypeScript definitions for Node.js |
| @types/pdf-parse | ^1.1.5 | TypeScript definitions for pdf-parse |
| jest | ^29.7.0 | JavaScript testing framework |
| ts-jest | ^29.1.2 | TypeScript preprocessor for Jest |

## Integration Points

### Works With

| Project | Integration Type | Description |
|---------|-----------------|-------------|
| Claude Desktop | MCP Client | Primary consumer of this MCP server via stdio transport |
| Any MCP Client | MCP Client | Compatible with any application supporting Model Context Protocol |

Standalone MCP server - no direct integrations with other Mnehmos projects.

### External Services

| Service | Purpose | Required |
|---------|---------|----------|
| arXiv API | Search and retrieve academic paper metadata via REST API | Yes |
| arXiv PDF Server | Download full-text PDFs of papers for content extraction | Yes (for get_paper_content tool) |

## Development Guide

### Prerequisites

- Node.js 18+
- npm or pnpm package manager
- Git for version control

### Setup

```bash
# Clone the repository
git clone https://github.com/Mnehmos/mnehmos.arxiv.mcp.git
cd mnehmos.arxiv.mcp

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### Running Locally

```bash
# Development mode (requires rebuild after changes)
npm run build
npm start

# The server runs on stdio and waits for MCP client input
# To test, configure an MCP client like Claude Desktop to connect
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Output location
# build/ directory contains compiled JavaScript
# Main entry point: build/index.js
```

## Maintenance Notes

### Known Issues

1. XML parsing uses regex-based approach instead of proper XML parser - this is fragile and could break with unexpected arXiv API responses
2. PDF downloads have a 30-second timeout which may be insufficient for very large papers on slow connections
3. No rate limiting implemented for arXiv API calls - could potentially trigger API throttling with excessive requests
4. Cached PDFs are never cleaned up automatically - temp/pdfs/ directory will grow indefinitely
5. Error messages from arXiv API are not always user-friendly when passed through to MCP clients

### Future Considerations

1. Replace regex-based XML parsing with a proper XML parser library (e.g., fast-xml-parser)
2. Implement configurable timeout values for PDF downloads
3. Add rate limiting and request throttling to comply with arXiv API usage guidelines
4. Implement cache expiration and automatic cleanup for old PDFs
5. Add more sophisticated error handling and user-friendly error messages
6. Consider adding support for bulk downloads and batch operations
7. Add metadata extraction from PDFs (beyond just text content)

### Code Quality

| Metric | Status |
|--------|--------|
| Tests | Yes with 4 test suites covering all tools |
| Linting | None configured |
| Type Safety | TypeScript strict mode enabled |
| Documentation | JSDoc comments present, comprehensive README |

---

## Appendix: File Structure

```
mnehmos.arxiv.mcp/
├── src/
│   └── index.ts              # Main server implementation with ArxivServer class
├── test/
│   ├── setup.ts              # Jest test setup configuration
│   ├── search-papers.test.ts # Tests for search_papers tool
│   ├── get-paper.test.ts     # Tests for get_paper tool
│   ├── search-by-category.test.ts # Tests for search_by_category tool
│   └── get-paper-content.test.ts  # Tests for get_paper_content tool
├── build/                    # Compiled JavaScript output (generated)
├── temp/                     # Temporary directory for PDF caching
├── node_modules/             # Dependencies (generated)
├── package.json              # NPM configuration and dependencies
├── package-lock.json         # Locked dependency versions
├── tsconfig.json             # TypeScript compiler configuration
├── jest.config.js            # Jest testing framework configuration
├── README.md                 # User documentation and setup guide
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
├── .gitignore                # Git ignore patterns
└── PROJECT_KNOWLEDGE.md      # This document
```

---

*Generated by Project Review Orchestrator | 2025-12-29*
*Source: https://github.com/Mnehmos/mnehmos.arxiv.mcp*
