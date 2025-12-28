/**
 * Tests for the search_by_category tool
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import fs from 'fs-extra';
import { ArxivServer } from '../src/index.js';
import { MOCK_ARXIV_RESPONSE_PATH } from './setup.js';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('search_by_category tool', () => {
  let server: ArxivServer;
  
  beforeEach(() => {
    server = new ArxivServer();
    
    // Mock axios.get to return mock data
    mockedAxios.get.mockImplementation(async (url): Promise<any> => { // Add Promise<any> return type
      if (url.includes('export.arxiv.org/api/query')) {
        const mockResponse = await fs.readFile(MOCK_ARXIV_RESPONSE_PATH, 'utf-8');
        return {
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as any; // Cast return object to any
      }
      
      throw new Error(`Unexpected URL: ${url}`);
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return search results for a valid category', async () => {
    // Use the _testMethods property to access the searchByCategory method
    const searchByCategory = server._testMethods.searchByCategory;
    
    // Call the searchByCategory method
    const result = await searchByCategory({
      category: 'cs.AI',
      max_results: 3,
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBe(1);
    expect(result.content[0].type).toBe('text');
    
    // Verify that axios.get was called with the correct URL and parameters
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('export.arxiv.org/api/query'),
      expect.objectContaining({
        params: expect.objectContaining({
          search_query: 'cat:cs.AI',
        }),
      })
    );
  });
  
  it('should handle pagination parameters', async () => {
    // Use the _testMethods property to access the searchByCategory method
    const searchByCategory = server._testMethods.searchByCategory;
    
    // Call the searchByCategory method with pagination parameters
    const result = await searchByCategory({
      category: 'cs.AI',
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
    // Use the _testMethods property to access the searchByCategory method
    const searchByCategory = server._testMethods.searchByCategory;
    
    // Call the searchByCategory method with sorting parameters
    const result = await searchByCategory({
      category: 'cs.AI',
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
  
  it('should handle invalid category gracefully', async () => {
    // Use the _testMethods property to access the searchByCategory method
    const searchByCategory = server._testMethods.searchByCategory;
    
    // Mock axios.get to throw an error for invalid categories
    mockedAxios.get.mockImplementationOnce(() => {
      throw new Error('Category not found');
    });
    
    // Expect the function to throw an error
    await expect(async () => {
      await searchByCategory({
        category: 'invalid-category',
      });
    }).rejects.toThrow();
    
    // Verify that axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});