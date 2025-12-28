#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs-extra';
import * as path from 'path';
// pdf-parse will be imported dynamically where needed

// Base URL for arXiv API
const ARXIV_API_BASE_URL = 'http://export.arxiv.org/api/query';

// Directory for temporary PDF storage
const TEMP_PDF_DIR = path.join(process.cwd(), 'temp', 'pdfs');

// Interface for search parameters
interface SearchParams {
  search_query?: string;
  id_list?: string;
  start?: number;
  max_results?: number;
  sortBy?: string;
  sortOrder?: string;
}

// Interface for paper search arguments
interface SearchPapersArgs {
  query?: string;
  category?: string;
  author?: string;
  title?: string;
  abstract?: string;
  start?: number;
  max_results?: number;
  sort_by?: string;
  sort_order?: string;
}

// Interface for get paper arguments
interface GetPaperArgs {
  paper_id: string;
}

// Interface for category search arguments
interface SearchByCategoryArgs {
  category: string;
  start?: number;
  max_results?: number;
  sort_by?: string;
  sort_order?: string;
}

// Interface for get paper content arguments
interface GetPaperContentArgs {
  paper_id: string;
}

export class ArxivServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'arxiv-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Expose private methods for testing purposes
   * This allows tests to access these methods without type casting
   */
  // Property for testing purposes only
  public _testMethods = {
    searchPapers: this.searchPapers.bind(this),
    getPaper: this.getPaper.bind(this),
    searchByCategory: this.searchByCategory.bind(this),
    getPaperContent: this.getPaperContent.bind(this),
    queryArxiv: this.queryArxiv.bind(this),
    processArxivResponse: this.processArxivResponse.bind(this),
    downloadPdf: this.downloadPdf.bind(this),
    extractTextFromPdf: this.extractTextFromPdf.bind(this),
  };

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_papers',
          description: 'Search for papers on arXiv by various criteria',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'General search query across all fields',
              },
              category: {
                type: 'string',
                description: 'arXiv category (e.g., cs.AI, physics.optics)',
              },
              author: {
                type: 'string',
                description: 'Author name',
              },
              title: {
                type: 'string',
                description: 'Words in the title',
              },
              abstract: {
                type: 'string',
                description: 'Words in the abstract',
              },
              start: {
                type: 'number',
                description: 'Starting index for pagination (0-based)',
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (max 2000)',
              },
              sort_by: {
                type: 'string',
                description: 'Sort by: relevance, lastUpdatedDate, submittedDate',
                enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
              },
              sort_order: {
                type: 'string',
                description: 'Sort order: ascending or descending',
                enum: ['ascending', 'descending'],
              },
            },
          },
        },
        {
          name: 'get_paper',
          description: 'Get details about a specific paper by its arXiv ID',
          inputSchema: {
            type: 'object',
            properties: {
              paper_id: {
                type: 'string',
                description: 'arXiv paper ID (e.g., 2104.13478 or cs/0001001)',
              },
            },
            required: ['paper_id'],
          },
        },
        {
          name: 'search_by_category',
          description: 'Search for papers in a specific arXiv category',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'arXiv category (e.g., cs.AI, physics.optics)',
              },
              start: {
                type: 'number',
                description: 'Starting index for pagination (0-based)',
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (max 2000)',
              },
              sort_by: {
                type: 'string',
                description: 'Sort by: relevance, lastUpdatedDate, submittedDate',
                enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
              },
              sort_order: {
                type: 'string',
                description: 'Sort order: ascending or descending',
                enum: ['ascending', 'descending'],
              },
            },
            required: ['category'],
          },
        },
        {
          name: 'get_paper_content',
          description: 'Get the full text content of a paper by downloading and extracting text from its PDF',
          inputSchema: {
            type: 'object',
            properties: {
              paper_id: {
                type: 'string',
                description: 'arXiv paper ID (e.g., 2104.13478 or cs/0001001)',
              },
            },
            required: ['paper_id'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_papers':
            return await this.searchPapers(request.params.arguments as unknown as SearchPapersArgs);
          case 'get_paper':
            if (!request.params.arguments || typeof request.params.arguments.paper_id !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing or invalid paper_id parameter'
              );
            }
            return await this.getPaper(request.params.arguments as unknown as GetPaperArgs);
          case 'search_by_category':
            if (!request.params.arguments || typeof request.params.arguments.category !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing or invalid category parameter'
              );
            }
            return await this.searchByCategory(request.params.arguments as unknown as SearchByCategoryArgs);
          case 'get_paper_content':
            if (!request.params.arguments || typeof request.params.arguments.paper_id !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing or invalid paper_id parameter'
              );
            }
            return await this.getPaperContent(request.params.arguments as unknown as GetPaperContentArgs);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `arXiv API error: ${error.response?.data || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  public async searchPapers(args: SearchPapersArgs) {
    const searchParams: SearchParams = {};
    
    // Build search query
    const searchTerms: string[] = [];
    
    if (args.query) {
      searchTerms.push(`all:${args.query}`);
    }
    
    if (args.category) {
      searchTerms.push(`cat:${args.category}`);
    }
    
    if (args.author) {
      searchTerms.push(`au:${args.author}`);
    }
    
    if (args.title) {
      searchTerms.push(`ti:${args.title}`);
    }
    
    if (args.abstract) {
      searchTerms.push(`abs:${args.abstract}`);
    }
    
    if (searchTerms.length > 0) {
      searchParams.search_query = searchTerms.join('+AND+');
    }
    
    // Add pagination
    if (args.start !== undefined) {
      searchParams.start = args.start;
    }
    
    if (args.max_results !== undefined) {
      searchParams.max_results = Math.min(args.max_results, 2000); // API limit
    } else {
      searchParams.max_results = 10; // Default
    }
    
    // Add sorting
    if (args.sort_by) {
      searchParams.sortBy = args.sort_by;
    }
    
    if (args.sort_order) {
      searchParams.sortOrder = args.sort_order;
    }
    
    const response = await this.queryArxiv(searchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async getPaper(args: GetPaperArgs) {
    const searchParams: SearchParams = {
      id_list: args.paper_id,
    };
    
    const response = await this.queryArxiv(searchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async searchByCategory(args: SearchByCategoryArgs) {
    const searchParams: SearchParams = {
      search_query: `cat:${args.category}`,
    };
    
    // Add pagination
    if (args.start !== undefined) {
      searchParams.start = args.start;
    }
    
    if (args.max_results !== undefined) {
      searchParams.max_results = Math.min(args.max_results, 2000); // API limit
    } else {
      searchParams.max_results = 10; // Default
    }
    
    // Add sorting
    if (args.sort_by) {
      searchParams.sortBy = args.sort_by;
    }
    
    if (args.sort_order) {
      searchParams.sortOrder = args.sort_order;
    }
    
    const response = await this.queryArxiv(searchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async queryArxiv(params: SearchParams) {
    try {
      const response = await axios.get(ARXIV_API_BASE_URL, { params });
      
      // Parse the XML response
      const xmlData = response.data;
      
      // Extract and process the data
      // For simplicity, we're returning the raw XML data
      // In a production environment, you would parse this XML into a more usable format
      return this.processArxivResponse(xmlData);
    } catch (error) {
      console.error('Error querying arXiv API:', error);
      throw error;
    }
  }

  private processArxivResponse(xmlData: string) {
    try {
      // Basic XML parsing to extract paper information
      const papers: any[] = [];
      
      // Extract feed information
      const titleMatch = xmlData.match(/<title[^>]*>(.*?)<\/title>/);
      const totalResultsMatch = xmlData.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
      const startIndexMatch = xmlData.match(/<opensearch:startIndex[^>]*>(\d+)<\/opensearch:startIndex>/);
      const itemsPerPageMatch = xmlData.match(/<opensearch:itemsPerPage[^>]*>(\d+)<\/opensearch:itemsPerPage>/);
      
      // Extract entry elements
      const entryRegex = /<entry>(.*?)<\/entry>/gs;
      let entryMatch;
      
      while ((entryMatch = entryRegex.exec(xmlData)) !== null) {
        const entry = entryMatch[1];
        
        // Extract paper details
        const idMatch = entry.match(/<id[^>]*>(.*?)<\/id>/);
        const titleMatch = entry.match(/<title[^>]*>(.*?)<\/title>/);
        const summaryMatch = entry.match(/<summary[^>]*>(.*?)<\/summary>/);
        const publishedMatch = entry.match(/<published[^>]*>(.*?)<\/published>/);
        const updatedMatch = entry.match(/<updated[^>]*>(.*?)<\/updated>/);
        
        // Extract authors
        const authors: string[] = [];
        const authorRegex = /<author[^>]*>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/g;
        let authorMatch;
        while ((authorMatch = authorRegex.exec(entry)) !== null) {
          authors.push(authorMatch[1].trim());
        }
        
        // Extract categories
        const categories: string[] = [];
        const categoryRegex = /<category[^>]*term="([^"]+)"/g;
        let categoryMatch;
        while ((categoryMatch = categoryRegex.exec(entry)) !== null) {
          categories.push(categoryMatch[1]);
        }
        
        // Extract links
        const links: any[] = [];
        const linkRegex = /<link[^>]*href="([^"]+)"[^>]*(?:rel="([^"]+)")?[^>]*(?:type="([^"]+)")?[^>]*\/>/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(entry)) !== null) {
          links.push({
            href: linkMatch[1],
            rel: linkMatch[2] || 'alternate',
            type: linkMatch[3] || 'text/html'
          });
        }
        
        const paper = {
          id: idMatch ? idMatch[1].trim() : '',
          title: titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '',
          summary: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '',
          authors: authors,
          published: publishedMatch ? publishedMatch[1].trim() : '',
          updated: updatedMatch ? updatedMatch[1].trim() : '',
          categories: categories,
          links: links,
          // Extract arXiv ID from the main ID
          arxiv_id: idMatch ? idMatch[1].replace('http://arxiv.org/abs/', '') : ''
        };
        
        papers.push(paper);
      }
      
      return {
        feed_title: titleMatch ? titleMatch[1].trim() : '',
        total_results: totalResultsMatch ? parseInt(totalResultsMatch[1]) : 0,
        start_index: startIndexMatch ? parseInt(startIndexMatch[1]) : 0,
        items_per_page: itemsPerPageMatch ? parseInt(itemsPerPageMatch[1]) : 0,
        papers: papers
      };
    } catch (error) {
      console.error('Error parsing arXiv XML response:', error);
      return {
        error: 'Failed to parse arXiv response',
        raw_response: xmlData.substring(0, 1000) + '...' // Truncated for safety
      };
    }
  }

  /**
   * Downloads a PDF file from a URL and saves it to the temporary directory
   * @param url URL of the PDF to download
   * @param paperId arXiv paper ID (used for filename)
   * @returns Path to the downloaded PDF file
   */
  private async downloadPdf(url: string, paperId: string): Promise<string> {
    try {
      // Ensure temp directory exists
      await fs.ensureDir(TEMP_PDF_DIR);
      
      // Create a unique filename based on the paper ID
      const sanitizedPaperId = paperId.replace(/\//g, '_');
      const pdfPath = path.join(TEMP_PDF_DIR, `${sanitizedPaperId}.pdf`);
      
      // Check if we already have this PDF cached
      if (await fs.pathExists(pdfPath)) {
        console.error(`Using cached PDF for ${paperId}`);
        return pdfPath;
      }
      
      console.error(`Downloading PDF for ${paperId} from ${url}`);
      
      // Download the PDF with proper headers
      // Note: Using responseType 'arraybuffer' to handle binary data
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'arXiv-MCP-Server/0.1.0 (https://github.com/your-username/arxiv-mcp-server)',
        },
        // Add a timeout to prevent hanging on large files
        timeout: 30000,
      });
      
      // Save the PDF to disk
      await fs.outputFile(pdfPath, response.data);
      
      return pdfPath;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extracts text content from a PDF file
   * @param pdfPath Path to the PDF file
   * @returns Extracted text content
   */
  private async extractTextFromPdf(pdfPath: string): Promise<string> {
    try {
      // Read the PDF file
      const dataBuffer = await fs.readFile(pdfPath);

      // Dynamically import pdf-parse
      const pdfParse = (await import('pdf-parse')).default;

      // Parse the PDF
      const data = await pdfParse(dataBuffer);

      // Return the text content
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the full text content of a paper by downloading and extracting text from its PDF
   * @param args Object containing paper_id
   * @returns Object containing the extracted text content
   */
  private async getPaperContent(args: GetPaperContentArgs) {
    try {
      // Construct the PDF URL directly
      // arXiv PDF URLs follow the pattern: https://arxiv.org/pdf/{paper_id}.pdf
      const pdfUrl = `https://arxiv.org/pdf/${args.paper_id}.pdf`;
      
      // Download the PDF
      const pdfPath = await this.downloadPdf(pdfUrl, args.paper_id);
      
      // Extract text from the PDF
      const textContent = await this.extractTextFromPdf(pdfPath);
      
      // Clean up the text (remove excessive whitespace, normalize line breaks)
      const cleanedText = textContent
        .replace(/\s+/g, ' ')
        .replace(/(\r\n|\n|\r)/gm, '\n')
        .trim();
      
      // Return the extracted text
      return {
        content: [
          {
            type: 'text',
            text: cleanedText,
          },
        ],
      };
    } catch (error) {
      console.error('Error in getPaperContent:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving paper content: ${error.response?.data || error.message}`,
            },
          ],
          isError: true,
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Error processing paper content: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('arXiv MCP server running on stdio');
  }
}

const server = new ArxivServer();
server.run().catch(console.error);