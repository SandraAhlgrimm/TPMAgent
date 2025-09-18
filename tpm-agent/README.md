# TPM Agent

A comprehensive Technical Project Management (TPM) agent that combines GitHub integration with Microsoft Office 365 capabilities for enhanced project management workflows.

## Features

### Core Capabilities
- **AI-Powered Project Management**: Advanced AI assistant for technical project planning and roadmap creation
- **GitHub Integration**: Full repository management, issues, milestones, and project boards
- **Intelligent Chat Interface**: Persistent conversation history with markdown export

### O365 Integration (Optional)
- **PowerPoint Presentations**: Auto-generate project kickoff decks, status reports, and documentation
- **Email Communication**: Send stakeholder updates and project communications
- **Calendar Management**: Schedule sprint ceremonies, reviews, and team meetings
- **Microsoft Planner**: Create and manage organizational tasks
- **Teams Integration**: Automatic Teams meeting creation for project ceremonies

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- GitHub account with OAuth app
- Azure OpenAI service
- Microsoft 365 account (optional, for O365 features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tpm-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```

### Configuration

#### Required Environment Variables

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
```

#### Optional O365 Integration

```env
# Microsoft O365 Integration (Optional)
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-app-client-id
AZURE_CLIENT_SECRET=your-azure-app-client-secret

# O365 Default Configuration
# Set these to your actual Microsoft 365 email addresses
O365_DEFAULT_SENDER=your-email@company.com
O365_DEFAULT_ORGANIZER=your-email@company.com
```

### Setup Instructions

#### 1. GitHub OAuth App Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Configure:
   - **Application name**: "TPM Agent"
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
4. Copy the Client ID and Client Secret to your `.env.local`

#### 2. Azure OpenAI Setup

1. Create an Azure OpenAI resource in Azure Portal
2. Deploy a GPT model (GPT-4 recommended)
3. Copy the endpoint, API key, and deployment name to your `.env.local`

#### 3. O365 Integration Setup (Optional)

1. **Register Azure Application**
   - Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "TPM Agent O365 Integration"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Not required for this setup

2. **Configure API Permissions**
   Add the following Microsoft Graph permissions:
   - `Calendars.ReadWrite` - Create and manage calendar events
   - `Mail.Send` - Send emails on behalf of the user
   - `Files.ReadWrite.All` - Create PowerPoint presentations in OneDrive
   - `Group.ReadWrite.All` - Access Microsoft Planner (if using Planner features)
   - `User.Read` - Basic user profile access

3. **Grant Admin Consent**
   - In the API permissions tab, click "Grant admin consent"

4. **Create Client Secret**
   - Go to "Certificates & secrets" → "New client secret"
   - Copy the secret value to your `.env.local`

5. **Get Tenant and Client ID**
   - Copy Tenant ID from the Overview tab
   - Copy Application (client) ID from the Overview tab

### Running the Application

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Basic Workflow

1. **Authentication**: Sign in with your GitHub account
2. **Repository Selection**: Choose an active repository for project management
3. **AI Chat**: Interact with the TPM agent for project planning and roadmap creation
4. **GitHub Integration**: The agent can create issues, milestones, and manage project boards
5. **O365 Features**: If configured, leverage PowerPoint, email, and calendar capabilities

### O365 Features Usage

When O365 integration is configured, you can:

#### Create Project Presentations
```typescript
// Example: Request a project kickoff presentation
"Create a project kickoff presentation for the new user authentication feature with slides covering project overview, timeline, team roles, and risk assessment."
```

#### Send Stakeholder Emails
```typescript
// Example: Send project status update
"Send a project status email to stakeholders with current sprint progress, completed features, and upcoming milestones."
```

#### Schedule Project Meetings
```typescript
// Example: Schedule sprint planning
"Schedule a sprint planning meeting for next Monday 2-4 PM with the development team including agenda for story review and capacity planning."
```

### API Endpoints

#### O365 Integration API (`/api/o365`)

**Create PowerPoint Presentation**
```json
POST /api/o365
{
  "action": "createPresentation",
  "params": {
    "title": "Project Kickoff - User Auth Feature",
    "slides": [
      {"title": "Overview", "content": "Project goals and scope"},
      {"title": "Timeline", "content": "Milestone dates and deliverables"}
    ],
    "templateType": "kickoff"
  }
}
```

**Send Email**
```json
POST /api/o365
{
  "action": "sendEmail",
  "params": {
    "recipients": [{"address": "stakeholder@company.com", "name": "John Doe"}],
    "subject": "Project Status Update",
    "body": "<h1>Sprint 3 Update</h1><p>Completed features...</p>",
    "isHtml": true,
    "importance": "normal"
  }
}
```

**Create Meeting**
```json
POST /api/o365
{
  "action": "createMeeting",
  "params": {
    "subject": "Sprint Planning",
    "startTime": "2024-01-15T14:00:00.000Z",
    "endTime": "2024-01-15T16:00:00.000Z",
    "attendees": [{"email": "team@company.com", "type": "required"}],
    "meetingType": "sprint-planning"
  }
}
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with GitHub OAuth
- **AI Integration**: Azure OpenAI with MCP (Model Context Protocol)
- **O365 Integration**: Microsoft Graph API
- **Styling**: Tailwind CSS with dark mode support

### Key Components
- `lib/azure-openai.ts` - Azure OpenAI integration with MCP
- `lib/microsoft-graph.ts` - O365 integration and Graph API client
- `app/api/o365/route.ts` - O365 API endpoints
- `app/chat.tsx` - Main chat interface
- `app/config/instructions.md` - AI agent instructions

## Troubleshooting

### Common Issues

**O365 Features Not Working**
- Verify all O365 environment variables are set
- Check Azure app permissions and admin consent
- Ensure the Azure app has the correct API permissions

**GitHub Integration Issues**
- Verify GitHub OAuth app configuration
- Check callback URL matches exactly
- Ensure GitHub token has appropriate repository permissions

**Authentication Problems**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your deployment URL
- Clear browser cookies and try again

### Logs and Debugging

The application includes comprehensive logging. Check the console for detailed error messages and API call information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]

