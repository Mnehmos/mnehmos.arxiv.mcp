/**
 * Tests for the search_papers tool
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { ArxivServer } from '../src/index.js';
import { MOCK_ARXIV_RESPONSE_PATH } from './setup.js';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('search_papers tool', () => {
  let server: ArxivServer;
  
  beforeEach(() => {
    server = new ArxivServer();
    
    // Mock axios.get to return mock data
    mockedAxios.get.mockImplementation(async (url): Promise<any> => {
      if (url.includes('export.arxiv.org/api/query')) {
        const mockResponse = await fs.readFile(MOCK_ARXIV_RESPONSE_PATH, 'utf-8');
        return {
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as any;
      }
      
      throw new Error(`Unexpected URL: ${url}`);
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return search results for a valid query', async () => {
    // Use the _testMethods property to access the searchPapers method
    const result = await server._testMethods.searchPapers({
      query: 'machine learning',
      category: 'cs.AI',
      max_results: 3,
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBe(1);
    expect(result.content[0].type).toBe('text');
    
    // Verify that axios.get was called with the correct URL
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('export.arxiv.org/api/query'),
      expect.any(Object)
    );
  });
  
  it('should handle pagination parameters', async () => {
    // Use the _testMethods property to access the searchPapers method
    const result = await server._testMethods.searchPapers({
      query: 'machine learning',
      start: 10,
      max_results: 5,
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Verify that axios.get was called with the correct parameters
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          start: 10,
          max_results: 5,
        }),
      })
    );
  });
  
  it('should handle sorting parameters', async () => {
    // Use the _testMethods property to access the searchPapers method
    const result = await server._testMethods.searchPapers({
      query: 'machine learning',
      sort_by: 'submittedDate',
      sort_order: 'ascending',
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Verify that axios.get was called with the correct parameters
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          sortBy: 'submittedDate',
          sortOrder: 'ascending',
        }),
      })
    );
  });
  
  it('should handle empty search parameters', async () => {
    // Use the _testMethods property to access the searchPapers method
    const result = await server._testMethods.searchPapers({});
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Verify that axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});