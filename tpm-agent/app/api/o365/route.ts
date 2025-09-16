import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGraphClient, isO365Enabled } from "@/lib/microsoft-graph";
import { logger } from "@/lib/logger";

interface CreatePresentationRequest {
  action: 'createPresentation';
  params: {
    title: string;
    slides: Array<{ title: string; content: string }>;
    templateType?: 'kickoff' | 'status' | 'review' | 'roadmap';
  };
}

interface SendEmailRequest {
  action: 'sendEmail';
  params: {
    recipients: Array<{ address: string; name?: string }>;
    subject: string;
    body: string;
    isHtml?: boolean;
    importance?: 'low' | 'normal' | 'high';
  };
}

interface CreateMeetingRequest {
  action: 'createMeeting';
  params: {
    subject: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    attendees: Array<{ email: string; name?: string; type?: 'required' | 'optional' }>;
    body?: string;
    meetingType?: 'sprint-planning' | 'daily-standup' | 'sprint-review' | 'retrospective' | 'stakeholder-update' | 'general';
  };
}

interface GetAvailabilityRequest {
  action: 'getAvailability';
  params: {
    emails: string[];
    startTime: string; // ISO string
    endTime: string; // ISO string
  };
}

interface CreatePlannerTaskRequest {
  action: 'createPlannerTask';
  params: {
    planId: string;
    title: string;
    description?: string;
    assigneeIds?: string[];
  };
}

type O365Request = 
  | CreatePresentationRequest 
  | SendEmailRequest 
  | CreateMeetingRequest 
  | GetAvailabilityRequest
  | CreatePlannerTaskRequest;

export async function POST(request: NextRequest) {
  try {
    // Check if O365 is configured
    if (!isO365Enabled()) {
      return NextResponse.json(
        { 
          error: 'O365 integration not configured', 
          message: 'Please configure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.' 
        },
        { status: 503 }
      );
    }

    // Verify authentication
    const token = await getToken({ req: request });
    
    if (!token?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: O365Request = await request.json();
    const { action, params } = body;

    // Validate request structure
    if (!action || !params) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected: { action: string, params: object }' },
        { status: 400 }
      );
    }

    logger.info(`O365 API Request: ${action}`, { userId: token.sub });

    const graphClient = getGraphClient();

    switch (action) {
      case 'createPresentation': {
        const { title, slides, templateType } = params;
        
        if (!title || !slides || !Array.isArray(slides)) {
          return NextResponse.json(
            { error: 'Title and slides array are required for presentation creation' },
            { status: 400 }
          );
        }

        const presentation = await graphClient.createPowerPointPresentation(
          title,
          slides,
          templateType
        );
        
        logger.info(`PowerPoint created: ${presentation.name}`);
        return NextResponse.json({ success: true, data: presentation });
      }

      case 'sendEmail': {
        const { recipients, subject, body, isHtml = true, importance = 'normal' } = params;
        
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
          return NextResponse.json(
            { error: 'Recipients array is required and cannot be empty' },
            { status: 400 }
          );
        }
        
        if (!subject || !body) {
          return NextResponse.json(
            { error: 'Subject and body are required for email sending' },
            { status: 400 }
          );
        }

        const emailResult = await graphClient.sendEmail(
          recipients,
          subject,
          body,
          isHtml,
          importance
        );
        
        logger.info(`Email sent to ${recipients.length} recipients`);
        return NextResponse.json({ success: true, data: emailResult });
      }

      case 'createMeeting': {
        const { subject, startTime, endTime, attendees, body, meetingType } = params;
        
        if (!subject || !startTime || !endTime || !attendees || !Array.isArray(attendees)) {
          return NextResponse.json(
            { error: 'Subject, startTime, endTime, and attendees array are required for meeting creation' },
            { status: 400 }
          );
        }

        try {
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
              { error: 'Invalid date format. Use ISO string format.' },
              { status: 400 }
            );
          }
          
          if (startDate >= endDate) {
            return NextResponse.json(
              { error: 'Start time must be before end time' },
              { status: 400 }
            );
          }

          const meeting = await graphClient.createMeetingInvite(
            subject,
            startDate,
            endDate,
            attendees,
            body,
            meetingType
          );
          
          logger.info(`Meeting created: ${meeting.subject} with ${meeting.attendeeCount} attendees`);
          return NextResponse.json({ success: true, data: meeting });
          
        } catch (dateError) {
          return NextResponse.json(
            { error: 'Invalid date format. Please use ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)' },
            { status: 400 }
          );
        }
      }

      case 'getAvailability': {
        const { emails, startTime, endTime } = params;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
          return NextResponse.json(
            { error: 'Emails array is required and cannot be empty' },
            { status: 400 }
          );
        }
        
        if (!startTime || !endTime) {
          return NextResponse.json(
            { error: 'StartTime and endTime are required' },
            { status: 400 }
          );
        }

        try {
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
              { error: 'Invalid date format. Use ISO string format.' },
              { status: 400 }
            );
          }

          const availability = await graphClient.getCalendarAvailability(
            emails,
            startDate,
            endDate
          );
          
          return NextResponse.json({ success: true, data: availability });
          
        } catch (dateError) {
          return NextResponse.json(
            { error: 'Invalid date format. Please use ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)' },
            { status: 400 }
          );
        }
      }

      case 'createPlannerTask': {
        const { planId, title, description, assigneeIds } = params;
        
        if (!planId || !title) {
          return NextResponse.json(
            { error: 'PlanId and title are required for task creation' },
            { status: 400 }
          );
        }

        const task = await graphClient.createPlannerTask(
          planId,
          title,
          description,
          assigneeIds
        );
        
        logger.info(`Planner task created: ${task.title}`);
        return NextResponse.json({ success: true, data: task });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: createPresentation, sendEmail, createMeeting, getAvailability, createPlannerTask` },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('O365 API Error:', error);
    
    // Handle specific Microsoft Graph errors
    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your Azure credentials.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('permission') || error.message.includes('forbidden')) {
        return NextResponse.json(
          { error: 'Insufficient permissions. Please check your Azure app permissions.' },
          { status: 403 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Requested resource not found.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the O365 request.' },
      { status: 500 }
    );
  }
}

// Handle GET requests for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'O365 Integration API',
    description: 'API for Microsoft Office 365 capabilities in TPM Agent',
    version: '1.0.0',
    capabilities: {
      presentations: {
        action: 'createPresentation',
        description: 'Create PowerPoint presentations for project management',
        templateTypes: ['kickoff', 'status', 'review', 'roadmap']
      },
      email: {
        action: 'sendEmail',
        description: 'Send project-related emails to stakeholders',
        features: ['HTML content', 'Multiple recipients', 'Priority levels']
      },
      meetings: {
        action: 'createMeeting',
        description: 'Create meeting invites with Teams integration',
        meetingTypes: ['sprint-planning', 'daily-standup', 'sprint-review', 'retrospective', 'stakeholder-update', 'general']
      },
      calendar: {
        action: 'getAvailability',
        description: 'Check calendar availability for meeting scheduling'
      },
      planner: {
        action: 'createPlannerTask',
        description: 'Create tasks in Microsoft Planner'
      }
    },
    configuration: {
      required_env_vars: [
        'AZURE_TENANT_ID',
        'AZURE_CLIENT_ID', 
        'AZURE_CLIENT_SECRET'
      ],
      configured: isO365Enabled()
    }
  });
}
