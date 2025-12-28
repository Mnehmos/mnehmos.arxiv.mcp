# mnehmos.arxiv.mcp

An MCP (Model Context Protocol) server that provides tools for interacting with the arXiv API to search and retrieve academic papers.

## Overview

This server implements the Model Context Protocol to provide tools for searching and retrieving papers from the arXiv preprint repository. It allows AI assistants to search for papers by various criteria, get details about specific papers, search by category, and extract full text content from PDFs.

## Features

- **Search Papers**: Search for papers using various criteria (title, author, abstract, category, etc.)
- **Get Paper Details**: Get detailed information about a specific paper by its arXiv ID
- **Category Search**: Search for papers in a specific arXiv category
- **PDF Content Extraction**: Download and extract full text content from paper PDFs
- **Structured Results**: Returns properly parsed JSON data instead of raw XML
- **Caching**: Intelligent PDF caching to avoid redundant downloads

## Installation

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/Mnehmos/mnehmos.arxiv.mcp.git
   cd mnehmos.arxiv.mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### As an MCP Server

Start the server:

```bash
npm start
```

The server will run on stdio, allowing it to communicate with MCP clients.

### MCP Client Configuration

Add this configuration to your MCP client settings. For Claude Desktop, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arxiv": {
      "name": "arxiv-mcp-server",
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "C:/path/to/arxiv-mcp-server",
      "enabled": true,
      "alwaysAllow": [
        "search_papers",
        "get_paper",
        "search_by_category",
        "get_paper_content"
      ],
      "env": {}
    }
  }
}
```

For other MCP clients, use a similar configuration structure. Make sure to:
- Update the `cwd` path to point to your arxiv-mcp-server directory
- Ensure the `build/index.js` file exists (run `npm run build` first)
- The `alwaysAllow` array lists tools that won't require user confirmation

## Available Tools

### `search_papers`

Search for papers on arXiv by various criteria with flexible query options.

**Parameters:**
- `query` (string, optional): General search query across all fields
- `category` (string, optional): arXiv category (e.g., `cs.AI`, `physics.optics`)
- `author` (string, optional): Author name to search for
- `title` (string, optional): Words to search for in the title
- `abstract` (string, optional): Words to search for in the abstract
- `start` (number, optional): Starting index for pagination (0-based, default: 0)
- `max_results` (number, optional): Maximum number of results to return (max 2000, default: 10)
- `sort_by` (string, optional): Sort by `relevance`, `lastUpdatedDate`, or `submittedDate`
- `sort_order` (string, optional): Sort order `ascending` or `descending`

**Example Response:**
```json
{
  "feed_title": "arXiv Query: search_query=all:machine+learning",
  "total_results": 150000,
  "start_index": 0,
  "items_per_page": 10,
  "papers": [
    {
      "id": "http://arxiv.org/abs/2104.13478",
      "arxiv_id": "2104.13478",
      "title": "Advanced Machine Learning Techniques",
      "summary": "This paper discusses advanced machine learning techniques...",
      "authors": ["John Smith", "Jane Doe"],
      "published": "2021-04-28T09:00:00Z",
      "updated": "2021-04-28T09:00:00Z",
      "categories": ["cs.LG", "cs.AI"],
      "links": [
        {
          "href": "http://arxiv.org/abs/2104.13478",
          "rel": "alternate",
          "type": "text/html"
        }
      ]
    }
  ]
}
```

### `get_paper`

Get detailed information about a specific paper by its arXiv ID.

**Parameters:**
- `paper_id` (string, required): arXiv paper ID (e.g., `2104.13478` or `cs/0001001`)

**Returns:** Same structured format as `search_papers` but for a single paper.

### `search_by_category`

Search for papers in a specific arXiv category with pagination and sorting options.

**Parameters:**
- `category` (string, required): arXiv category (e.g., `cs.AI`, `physics.optics`)
- `start` (number, optional): Starting index for pagination (0-based)
- `max_results` (number, optional): Maximum number of results to return (max 2000)
- `sort_by` (string, optional): Sort by `relevance`, `lastUpdatedDate`, or `submittedDate`
- `sort_order` (string, optional): Sort order `ascending` or `descending`

### `get_paper_content`

Download and extract the full text content from a paper's PDF.

**Parameters:**
- `paper_id` (string, required): arXiv paper ID (e.g., `2104.13478`)

**Features:**
- Downloads PDFs from arXiv's servers
- Caches PDFs locally to avoid redundant downloads
- Extracts and cleans text content using pdf-parse
- Handles network errors and parsing issues gracefully
- Returns plain text content suitable for analysis

**Returns:** Plain text content of the paper.

## Common arXiv Categories

- `cs.AI` - Artificial Intelligence
- `cs.LG` - Machine Learning
- `cs.CL` - Computation and Language
- `cs.CV` - Computer Vision and Pattern Recognition
- `physics.optics` - Optics
- `math.CO` - Combinatorics
- `stat.ML` - Machine Learning (Statistics)

For a complete list, see [arXiv Subject Classifications](https://arxiv.org/category_taxonomy).

## Development

### Running Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Watch Mode (for development)

```bash
npm run test:watch
```

## API Reference

This server uses the official arXiv API. For more information:
- [arXiv API Basics](https://info.arxiv.org/help/api/basics.html)
- [arXiv API User Manual](https://info.arxiv.org/help/api/user-manual.html)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0 (Initial Release)
- Basic arXiv API integration
- Search papers by multiple criteria
- Get individual paper details
- Category-based search
- PDF content extraction with caching
- Structured JSON response parsing
- MCP protocol implementation