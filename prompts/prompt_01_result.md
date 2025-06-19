# MCP GitHub Issues Server - Project Roadmap

## Project Overview
Build an MCP (Model Context Protocol) SSE server in TypeScript that automates GitHub issue creation using Octokit, with support for labels, milestones, and project assignment through YAML configuration.

## Phase 1: Foundation & Setup

### Task 1.1: Project Initialization and Dependencies
**Description**: Set up the TypeScript project structure with all required dependencies for MCP server, GitHub integration, and configuration management.

**Acceptance Criteria**:
- TypeScript project initialized with proper tsconfig.json
- All dependencies installed: @modelcontextprotocol/sdk-typescript, @octokit/rest, yaml, dotenv, zod
- Project structure created with src/, dist/, and config/ directories
- Package.json configured with build and start scripts
- ESLint and Prettier configured for code quality

**Implementation Prompt**: 
Create a new TypeScript project for an MCP server. Initialize with `npm init` and install dependencies: `@modelcontextprotocol/sdk-typescript`, `@octokit/rest`, `yaml`, `dotenv`, `zod` for validation, and dev dependencies `typescript`, `@types/node`, `ts-node`, `eslint`, `prettier`. Set up tsconfig.json targeting ES2022, create folder structure with src/server.ts as entry point, and configure package.json scripts for build and development.

### Task 1.2: Configuration Schema Design
**Description**: Define and implement YAML configuration schema and environment variable structure for GitHub integration settings.

**Acceptance Criteria**:
- YAML schema defined for repository settings, project configuration, milestone settings
- Zod validation schemas created for both YAML config and environment variables
- Environment variables defined for GitHub PAT and sensitive data
- Configuration loading function with proper error handling and validation
- Example config.yaml and .env.example files created

**Implementation Prompt**:
Design a YAML configuration schema that includes: repository owner/name, project ID, milestone duration (default 2 weeks), default labels to create, and any issue templates. Create Zod schemas to validate both the YAML config and environment variables (.env file should contain GITHUB_TOKEN). Implement a config loader function that reads both files, validates them, and exports typed configuration objects. Include comprehensive error messages for validation failures.

## Phase 2: MCP Server Core

### Task 2.1: Basic MCP SSE Server Setup
**Description**: Implement the core MCP SSE server using the official TypeScript SDK with proper tool registration and error handling.

**Acceptance Criteria**:
- MCP SSE server initialized and running on configurable port
- Server properly registers with MCP protocol handlers
- Basic health check and connection management implemented
- Graceful shutdown handling implemented
- Logging system integrated for debugging and monitoring

**Implementation Prompt**:
Using @modelcontextprotocol/sdk-typescript, create an SSE-based MCP server. Set up the server to listen on a configurable port (default 3001), implement proper MCP protocol message handling, and register the server with appropriate capabilities. Add structured logging using a simple logger, implement graceful shutdown on SIGINT/SIGTERM, and ensure the server can handle multiple concurrent connections properly.

### Task 2.2: MCP Tool Registration Framework
**Description**: Create the framework for registering and handling MCP tools, starting with tool discovery and basic request/response handling.

**Acceptance Criteria**:
- Tool registration system implemented with type safety
- Tool discovery endpoint responds with available tools
- Request validation and error handling for tool calls
- Tool execution context properly isolated
- Response formatting follows MCP protocol specifications

**Implementation Prompt**:
Implement the MCP tool registration framework. Create a base Tool interface that defines execute(), getName(), and getDescription() methods. Build a ToolRegistry class that manages tool registration and discovery. Implement the MCP protocol handlers for listing tools and executing tool calls, ensuring proper error handling and response formatting. Add TypeScript generics for type-safe tool parameters and responses.

## Phase 3: GitHub Integration

### Task 3.1: Octokit Client Setup and Authentication
**Description**: Initialize Octokit client with PAT authentication and implement basic GitHub API connectivity with error handling.

**Acceptance Criteria**:
- Octokit client properly initialized with PAT from environment
- Authentication validation on startup
- Rate limiting awareness and handling implemented
- Connection retry logic for transient failures
- GitHub API error handling with meaningful error messages

**Implementation Prompt**:
Set up Octokit REST client using the GitHub PAT from environment variables. Implement a GitHubClient class that wraps Octokit, handles authentication, and provides methods for common operations. Add rate limiting detection and backoff strategies, implement retry logic for network failures, and create comprehensive error handling that translates GitHub API errors into user-friendly messages. Include a connection test method to validate credentials on startup.

### Task 3.2: Repository and Project Validation
**Description**: Implement functions to validate repository access and project existence before attempting issue operations.

**Acceptance Criteria**:
- Repository existence and access validation
- Project ID validation and accessibility check
- Permission verification for issue creation
- Milestone existence verification with creation if needed
- Clear error messages for permission or access issues

**Implementation Prompt**:
Create validation functions that check if the configured repository exists and is accessible with the provided PAT. Implement project validation to ensure the project ID exists and the user has write access. Add milestone validation that checks if milestones exist and creates them if missing (using 2-week sprint intervals). Include permission checking to verify the user can create issues, labels, and modify projects. Provide detailed error messages for each validation failure.

## Phase 4: Issue Management Tools

### Task 4.1: Single Issue Creation Tool
**Description**: Implement MCP tool for creating individual GitHub issues with labels, milestone assignment, and project association.

**Acceptance Criteria**:
- MCP tool registered for creating single issues
- Issue creation with title, body, labels, milestone, and project assignment
- Label creation if labels don't exist
- Proper error handling for GitHub API failures
- Response includes created issue URL and details

**Implementation Prompt**:
Create a "create_github_issue" MCP tool that accepts parameters: title (required), body (optional), labels (array), milestone (optional), assignees (optional). Implement the tool to: 1) Create any missing labels first, 2) Create the issue with specified parameters, 3) Assign to milestone if provided, 4) Add to project if configured, 5) Return the created issue details including URL. Handle all GitHub API errors gracefully and provide meaningful feedback.

### Task 4.2: Batch Issue Creation Tool
**Description**: Implement MCP tool for creating multiple issues from a structured prompt format, with support for bulk operations and progress tracking.

**Acceptance Criteria**:
- MCP tool registered for batch issue creation
- Accepts array of issue definitions or structured prompt format
- Progress tracking and partial success handling
- Bulk label creation optimization
- Detailed response with success/failure status for each issue

**Implementation Prompt**:
Create a "create_github_issues_batch" MCP tool that accepts an array of issue definitions or a structured text prompt that can be parsed into issues. Implement batch processing that: 1) Pre-creates all unique labels in bulk, 2) Creates issues sequentially with progress tracking, 3) Handles partial failures gracefully, 4) Assigns all issues to the same milestone and project, 5) Returns detailed results showing success/failure for each issue with error details for failures.

## Phase 5: Advanced Features

### Task 5.1: Label Management and Generation
**Description**: Implement intelligent label creation and management, including label generation based on issue content and predefined label sets.

**Acceptance Criteria**:
- Automatic label generation based on issue titles/content
- Predefined label sets from configuration
- Label color assignment and management
- Duplicate label detection and reuse
- Label validation and sanitization

**Implementation Prompt**:
Create a label management system that can generate relevant labels based on issue content using simple keyword matching or categorization rules. Implement functions to create labels with appropriate colors (use a predefined color palette), check for existing labels to avoid duplicates, and sanitize label names for GitHub requirements. Allow configuration of standard label sets (bug, feature, enhancement, etc.) and merge them with generated labels.

### Task 5.2: Milestone Management
**Description**: Implement milestone creation and management with sprint-based scheduling and automatic milestone assignment.

**Acceptance Criteria**:
- Automatic milestone creation for 2-week sprints
- Current milestone detection and assignment
- Milestone scheduling and date management
- Milestone capacity tracking (optional)
- Integration with issue creation workflow

**Implementation Prompt**:
Create milestone management functions that automatically create and manage 2-week sprint milestones. Implement logic to determine the current active milestone based on dates, create new milestones as needed with proper naming (e.g., "Sprint 2024-01", "Sprint 2024-02"), and assign issues to the appropriate milestone. Include functions to list existing milestones, check milestone capacity, and handle milestone transitions smoothly.

## Phase 6: Integration and Testing

### Task 6.1: End-to-End Integration Testing
**Description**: Implement comprehensive testing for the complete MCP server workflow, from configuration loading to GitHub issue creation.

**Acceptance Criteria**:
- Integration tests for complete issue creation workflow
- Mock GitHub API for testing without hitting rate limits
- Configuration validation testing
- Error scenario testing and validation
- Performance testing for batch operations

**Implementation Prompt**:
Create comprehensive integration tests using Jest or similar testing framework. Mock the GitHub API using nock or similar library to test various scenarios including successful operations, API failures, rate limiting, and network errors. Test the complete workflow from MCP tool calls through GitHub issue creation. Include tests for configuration validation, batch processing, label creation, and milestone management. Add performance tests for large batch operations.

### Task 6.2: Documentation and Deployment Preparation
**Description**: Create comprehensive documentation, deployment guides, and example configurations for production use.

**Acceptance Criteria**:
- README with setup and usage instructions
- API documentation for all MCP tools
- Configuration examples and templates
- Deployment guide with environment setup
- Troubleshooting guide for common issues

**Implementation Prompt**:
Write comprehensive documentation including: 1) README with project overview, setup instructions, and usage examples, 2) Detailed configuration guide explaining all YAML options and environment variables, 3) MCP tool documentation with parameter descriptions and example calls, 4) Deployment guide covering production setup, security considerations, and monitoring, 5) Troubleshooting section with common errors and solutions. Include example configurations for different use cases and integration patterns.

## Task Dependencies and Parallelization

### Sequential Dependencies:
- 1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.2
- 4.1 must complete before 4.2
- 5.1 and 5.2 require 4.1 completion
- 6.1 requires all Phase 4 and 5 tasks
- 6.2 can begin after Phase 4 completion

### Parallel Opportunities:
- Tasks 5.1 and 5.2 can be developed in parallel
- Documentation (6.2) can be written in parallel with Phase 5 development
- Testing setup can begin during Phase 4 development

## Estimated Timeline:
- **Phase 1**: 2-3 days
- **Phase 2**: 3-4 days  
- **Phase 3**: 2-3 days
- **Phase 4**: 4-5 days
- **Phase 5**: 3-4 days
- **Phase 6**: 2-3 days

**Total Estimated Duration**: 16-22 days

## Success Metrics:
- MCP server successfully handles GitHub issue creation requests
- Batch processing can handle 50+ issues efficiently
- Configuration-driven setup works for different repositories/projects
- Error handling provides clear, actionable feedback
- Documentation enables easy setup and usage by other developers