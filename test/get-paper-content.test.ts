/**
 * Tests for the get_paper_content tool
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { ArxivServer } from '../src/index.js';
import { MOCK_PAPER_PATH } from './setup.js';

// Mock modules
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('pdf-parse');

describe('get_paper_content tool', () => {
  let server: ArxivServer;
  
  beforeEach(() => {
    server = new ArxivServer();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Simplified mocking approach to avoid TypeScript issues
    const mockedFs = fs as any;
    const mockedAxios = axios as any;
    
    mockedFs.ensureDir = jest.fn().mockResolvedValue(undefined as any);
    mockedFs.pathExists = jest.fn().mockResolvedValue(false as any);
    mockedFs.outputFile = jest.fn().mockResolvedValue(undefined as any);
    mockedFs.readFile = jest.fn().mockImplementation((filePath: any) => {
      if (typeof filePath === 'string' && filePath.endsWith('.pdf')) {
        return Promise.resolve(Buffer.from('Mock PDF content'));
      }
      return Promise.resolve('Mock paper content');
    });
    
    mockedAxios.get = jest.fn().mockImplementation((url: any) => {
      if (url.includes('arxiv.org/pdf')) {
        return Promise.resolve({
          data: Buffer.from('Mock PDF content'),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
  });
  
  it('should download and extract text from a PDF', async () => {
    // Use the _testMethods property to access the getPaperContent method
    const getPaperContent = server._testMethods.getPaperContent;
    
    // Call the getPaperContent method
    const result = await getPaperContent({
      paper_id: '2501.12345',
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBe(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBeDefined();
    
    // Verify that axios.get was called with the correct URL
    expect(axios.get).toHaveBeenCalledWith(
      'https://arxiv.org/pdf/2501.12345.pdf',
      expect.any(Object)
    );
    
    // Verify that fs.outputFile was called (to save the PDF)
    expect(fs.outputFile).toHaveBeenCalled();
    
    // Verify that fs.readFile was called (to read the PDF for parsing)
    expect(fs.readFile).toHaveBeenCalled();
  });
  
  it('should handle errors when downloading PDFs', async () => {
    // Use the _testMethods property to access the getPaperContent method
    const getPaperContent = server._testMethods.getPaperContent;
    
    // Mock axios.get to throw an error
    (axios.get as unknown as jest.Mock).mockImplementationOnce(() => {
      throw {
        isAxiosError: true,
        message: 'Network error',
        response: { data: 'Error downloading PDF' },
      };
    });
    
    // Call the getPaperContent method
    const result = await getPaperContent({
      paper_id: 'error-id',
    });
    
    // Verify the result indicates an error
    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content.length).toBe(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error');
    
    // Verify that axios.get was called
    expect(axios.get).toHaveBeenCalled();
  });
  
  it('should use cached PDF if it exists', async () => {
    // Use the _testMethods property to access the getPaperContent method
    const getPaperContent = server._testMethods.getPaperContent;
    
    // Mock fs.pathExists to return true (file exists)
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
    
    // Call the getPaperContent method
    const result = await getPaperContent({
      paper_id: 'cached-id',
    });
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Verify that axios.get was NOT called (should use cached file)
    expect(axios.get).not.toHaveBeenCalled();
    
    // Verify that fs.readFile was called (to read the cached PDF)
    expect(fs.readFile).toHaveBeenCalled();
  });
});