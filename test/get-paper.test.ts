/**
 * Tests for the get_paper tool
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import fs from 'fs-extra';
import { ArxivServer } from '../src/index.js';
import { MOCK_ARXIV_RESPONSE_PATH } from './setup.js';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('get_paper tool', () => {
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
  
  it('should return paper details for a valid paper ID', async () => {
    // Use the _testMethods property to access the getPaper method
    const getPaper = server._testMethods.getPaper;
    
    // Call the getPaper method
    const result = await getPaper({
      paper_id: '2501.12345',
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
          id_list: '2501.12345',
        }),
      })
    );
  });
  
  it('should handle invalid paper IDs gracefully', async () => {
    // Use the _testMethods property to access the getPaper method
    const getPaper = server._testMethods.getPaper;
    
    // Mock axios.get to throw an error for invalid paper IDs
    mockedAxios.get.mockImplementationOnce(() => {
      throw new Error('Paper not found');
    });
    
    // Expect the function to throw an error
    await expect(async () => {
      await getPaper({
        paper_id: 'invalid-id',
      });
    }).rejects.toThrow();
    
    // Verify that axios.get was called
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});