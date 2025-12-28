/**
 * Test setup file for the arXiv MCP server
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock data paths
export const MOCK_ARXIV_RESPONSE_PATH = path.join(__dirname, 'data', 'mock-arxiv-response.xml');
export const MOCK_PAPER_PATH = path.join(__dirname, 'data', 'mock-paper.txt');

// Ensure the mock data directory exists
fs.ensureDirSync(path.join(__dirname, 'data'));

// Create mock data files if they don't exist
if (!fs.existsSync(MOCK_ARXIV_RESPONSE_PATH)) {
  fs.writeFileSync(
    MOCK_ARXIV_RESPONSE_PATH,
    `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>arXiv Query: search_query=all:machine+learning</title>
  <id>http://arxiv.org/api/cits7KYOLJuBDbUbHI2Jow</id>
  <updated>2025-04-26T00:00:00-00:00</updated>
  <entry>
    <id>http://arxiv.org/abs/2501.12345</id>
    <title>Advanced Machine Learning Techniques</title>
    <summary>This paper discusses advanced machine learning techniques.</summary>
    <author>
      <name>John Smith</name>
    </author>
    <published>2025-01-15T00:00:00-00:00</published>
    <updated>2025-01-15T00:00:00-00:00</updated>
    <link href="http://arxiv.org/abs/2501.12345" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/2501.12345" rel="related" type="application/pdf"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`
  );
}

if (!fs.existsSync(MOCK_PAPER_PATH)) {
  fs.writeFileSync(
    MOCK_PAPER_PATH,
    `Advanced Machine Learning Techniques
by John Smith

Abstract
This paper discusses advanced machine learning techniques.

1. Introduction
Machine learning has become an essential tool in many fields.

2. Methods
We present several advanced techniques for machine learning.

3. Results
Our experiments show significant improvements over baseline methods.

4. Conclusion
Advanced machine learning techniques can greatly improve performance.

References
[1] Smith, J. (2024). Introduction to Machine Learning.
[2] Johnson, A. (2024). Deep Learning Fundamentals.`
  );
}

// Setup function for mocking axios
export function setupAxiosMock() {
  jest.mock('axios');
}

// Teardown function for cleaning up axios mock
export function teardownAxiosMock() {
  jest.restoreAllMocks();
}

// Helper function to create a mock request
export function createMockRequest(toolName: string, args: any) {
  return {
    jsonrpc: '2.0',
    id: '123',
    method: 'mcp.call_tool',
    params: {
      name: toolName,
      arguments: args,
    },
  };
}

// Global Jest setup
beforeAll(() => {
  // Global setup code
});

afterAll(() => {
  // Global teardown code
});