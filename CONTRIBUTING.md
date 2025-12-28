# Contributing to arXiv MCP Server

We welcome contributions to the arXiv MCP Server! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to see if the problem has already been reported. When you create a bug report, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)
- Any relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- Consider if this fits with the scope and goals of the project

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Update documentation** as needed
5. **Ensure tests pass** by running `npm test`
6. **Build the project** with `npm run build`
7. **Submit a pull request**

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/arxiv-mcp-server.git
   cd arxiv-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style and conventions
- Use meaningful variable and function names
- Add type annotations where helpful for clarity
- Avoid `any` types when possible

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Follow ESLint configuration (when added)

### Testing

- Write tests for new functionality
- Use Jest for testing
- Aim for good test coverage
- Test both success and error cases
- Use descriptive test names

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md for notable changes
- Include examples in documentation

## Commit Messages

Use clear and meaningful commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests when applicable
- Consider using conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `test:` for test changes
  - `refactor:` for code refactoring

Examples:
```
feat: add support for advanced search queries
fix: handle malformed XML responses gracefully
docs: update installation instructions
test: add tests for PDF content extraction
```

## Project Structure

```
arxiv-mcp-server/
├── src/                 # Source code
│   └── index.ts        # Main server implementation
├── test/               # Test files
│   ├── setup.ts       # Test setup and utilities
│   └── *.test.ts      # Individual test files
├── build/              # Compiled JavaScript (generated)
├── temp/               # Temporary files (cached PDFs)
└── docs/               # Additional documentation
```

## API Guidelines

### MCP Tool Design

When adding new tools:

1. Follow MCP protocol specifications
2. Use clear, descriptive tool names
3. Provide comprehensive input schemas
4. Return structured, predictable responses
5. Handle errors gracefully
6. Include proper documentation

### Error Handling

- Always handle potential errors
- Return meaningful error messages
- Use appropriate HTTP status codes
- Log errors for debugging
- Don't expose sensitive information

### Performance

- Cache responses when appropriate
- Implement rate limiting considerations
- Optimize for common use cases
- Consider memory usage for large files
- Test with realistic data sizes

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a pull request with changes
4. After review and merge, create a git tag
5. Publish to npm (maintainers only)

## Questions?

If you have questions about contributing, please:

1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Reach out to maintainers

Thank you for contributing to arXiv MCP Server!