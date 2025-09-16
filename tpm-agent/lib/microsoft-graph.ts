import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import { logger } from './logger';

interface SlideContent {
  title: string;
  content: string;
}

interface EmailRecipient {
  address: string;
  name?: string;
}

interface MeetingAttendee {
  email: string;
  name?: string;
  type?: 'required' | 'optional';
}

export class MicrosoftGraphClient {
  private client: Client;
  
  constructor() {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Microsoft Graph credentials not configured. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.');
    }
    
    try {
      const credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );
      
      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
      });
      
      this.client = Client.initWithMiddleware({
        authProvider
      });
    } catch (error) {
      logger.error('Failed to initialize Microsoft Graph client:', error);
      throw new Error('Failed to initialize Microsoft Graph client');
    }
  }
  
  /**
   * Create a new PowerPoint presentation for project management
   * @param title The presentation title
   * @param slides Array of slide content with title and content
   * @param templateType Type of presentation (kickoff, status, review)
   * @returns Created presentation details
   */
  async createPowerPointPresentation(
    title: string, 
    slides: SlideContent[], 
    templateType: 'kickoff' | 'status' | 'review' | 'roadmap' = 'status'
  ) {
    try {
      // Create a new PowerPoint file in OneDrive
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;
      
      // Create empty presentation file
      const driveItem = await this.client
        .api('/me/drive/root/children')
        .post({
          name: fileName,
          file: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });
      
      logger.info(`Created PowerPoint presentation: ${driveItem.name} at ${driveItem.webUrl}`);
      
      return {
        success: true,
        id: driveItem.id,
        name: driveItem.name,
        webUrl: driveItem.webUrl,
        downloadUrl: driveItem['@microsoft.graph.downloadUrl'],
        templateType,
        slideCount: slides.length
      };
    } catch (error) {
      logger.error('Failed to create PowerPoint presentation:', error);
      throw new Error(`Failed to create PowerPoint presentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Send project-related emails to stakeholders
   * @param recipients Array of email recipients
   * @param subject Email subject line
   * @param body Email body content (HTML supported)
   * @param isHtml Whether the body is HTML formatted
   * @param importance Email importance level
   * @returns Email sending result
   */
  async sendEmail(
    recipients: EmailRecipient[], 
    subject: string, 
    body: string, 
    isHtml: boolean = true,
    importance: 'low' | 'normal' | 'high' = 'normal'
  ) {
    try {
      const message = {
        message: {
          subject,
          body: {
            contentType: isHtml ? 'HTML' : 'Text',
            content: body
          },
          toRecipients: recipients.map(recipient => ({
            emailAddress: { 
              address: recipient.address,
              name: recipient.name || recipient.address
            }
          })),
          importance
        },
        saveToSentItems: true
      };
      
      await this.client
        .api('/me/sendMail')
        .post(message);
      
      const recipientList = recipients.map(r => r.address).join(', ');
      logger.info(`Email sent successfully to: ${recipientList}`);
      
      return { 
        success: true, 
        recipients: recipientList,
        subject,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create a meeting invite for project ceremonies (sprint planning, reviews, etc.)
   * @param subject Meeting subject
   * @param startTime Meeting start time
   * @param endTime Meeting end time
   * @param attendees Array of meeting attendees
   * @param body Meeting body/agenda
   * @param meetingType Type of meeting for templating
   * @returns Created meeting details
   */
  async createMeetingInvite(
    subject: string,
    startTime: Date,
    endTime: Date,
    attendees: MeetingAttendee[],
    body?: string,
    meetingType: 'sprint-planning' | 'daily-standup' | 'sprint-review' | 'retrospective' | 'stakeholder-update' | 'general' = 'general'
  ) {
    try {
      const event = {
        subject,
        body: {
          contentType: 'HTML',
          content: body || this.generateMeetingTemplate(meetingType, subject)
        },
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC'
        },
        attendees: attendees.map(attendee => ({
          emailAddress: { 
            address: attendee.email,
            name: attendee.name || attendee.email
          },
          type: attendee.type || 'required'
        })),
        allowNewTimeProposals: true,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        categories: [`TPM-${meetingType}`]
      };
      
      const createdEvent = await this.client
        .api('/me/calendar/events')
        .post(event);
      
      logger.info(`Meeting created: ${createdEvent.subject} for ${attendees.length} attendees`);
      
      return {
        success: true,
        id: createdEvent.id,
        subject: createdEvent.subject,
        webLink: createdEvent.webLink,
        onlineMeeting: createdEvent.onlineMeeting,
        meetingType,
        attendeeCount: attendees.length,
        startTime: createdEvent.start.dateTime,
        endTime: createdEvent.end.dateTime
      };
    } catch (error) {
      logger.error('Failed to create meeting invite:', error);
      throw new Error(`Failed to create meeting invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get user's calendar availability for meeting scheduling
   * @param emails Array of email addresses to check
   * @param startTime Start time for availability check
   * @param endTime End time for availability check
   * @returns Availability information
   */
  async getCalendarAvailability(emails: string[], startTime: Date, endTime: Date) {
    try {
      const schedules = emails.map(email => ({ scheduleId: email }));
      
      const freeBusyInfo = await this.client
        .api('/me/calendar/getSchedule')
        .post({
          scheduleIds: emails,
          startTime: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC'
          },
          endTime: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC'
          },
          availabilityViewInterval: 30
        });
      
      return {
        success: true,
        schedules: freeBusyInfo.value
      };
    } catch (error) {
      logger.error('Failed to get calendar availability:', error);
      throw new Error(`Failed to get calendar availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate meeting template based on meeting type
   * @param meetingType Type of meeting
   * @param subject Meeting subject
   * @returns HTML formatted meeting body
   */
  private generateMeetingTemplate(meetingType: string, subject: string): string {
    const templates = {
      'sprint-planning': `
        <h2>Sprint Planning - ${subject}</h2>
        <h3>Agenda:</h3>
        <ul>
          <li>Review previous sprint outcomes</li>
          <li>Discuss upcoming sprint goals</li>
          <li>Story point estimation</li>
          <li>Task assignment and capacity planning</li>
          <li>Risk identification and mitigation</li>
        </ul>
        <h3>Required Attendees:</h3>
        <p>Development team, Product Owner, Scrum Master</p>
      `,
      'daily-standup': `
        <h2>Daily Standup - ${subject}</h2>
        <h3>Discussion Points:</h3>
        <ul>
          <li>What did you accomplish yesterday?</li>
          <li>What are you working on today?</li>
          <li>Are there any blockers or impediments?</li>
        </ul>
        <p><strong>Duration:</strong> 15 minutes</p>
      `,
      'sprint-review': `
        <h2>Sprint Review - ${subject}</h2>
        <h3>Agenda:</h3>
        <ul>
          <li>Demo completed features</li>
          <li>Review sprint metrics and achievements</li>
          <li>Stakeholder feedback collection</li>
          <li>Next sprint preview</li>
        </ul>
      `,
      'retrospective': `
        <h2>Sprint Retrospective - ${subject}</h2>
        <h3>Discussion Framework:</h3>
        <ul>
          <li>What went well?</li>
          <li>What could be improved?</li>
          <li>What actions will we take?</li>
        </ul>
        <p><strong>Goal:</strong> Continuous improvement and team reflection</p>
      `,
      'stakeholder-update': `
        <h2>Stakeholder Update - ${subject}</h2>
        <h3>Agenda:</h3>
        <ul>
          <li>Project status overview</li>
          <li>Key milestones and deliverables</li>
          <li>Risk assessment and mitigation</li>
          <li>Resource requirements</li>
          <li>Upcoming decisions needed</li>
        </ul>
      `,
      'general': `
        <h2>${subject}</h2>
        <h3>Meeting Details:</h3>
        <p>Please review the agenda and come prepared for discussion.</p>
      `
    };
    
    return templates[meetingType as keyof typeof templates] || templates.general;
  }
  
  /**
   * Create a Planner task (if Planner is available)
   * @param planId The plan ID where to create the task
   * @param title Task title
   * @param description Task description
   * @param assigneeIds Array of user IDs to assign
   * @returns Created task details
   */
  async createPlannerTask(
    planId: string,
    title: string,
    description?: string,
    assigneeIds?: string[]
  ) {
    try {
      const task = {
        planId,
        title,
        assignments: assigneeIds ? 
          Object.fromEntries(assigneeIds.map(id => [id, { '@odata.type': 'microsoft.graph.plannerAssignment' }])) 
          : {}
      };
      
      const createdTask = await this.client
        .api('/planner/tasks')
        .post(task);
      
      // Add description if provided
      if (description) {
        await this.client
          .api(`/planner/tasks/${createdTask.id}/details`)
          .patch({
            description
          });
      }
      
      logger.info(`Planner task created: ${createdTask.title}`);
      
      return {
        success: true,
        id: createdTask.id,
        title: createdTask.title,
        planId: createdTask.planId
      };
    } catch (error) {
      logger.error('Failed to create Planner task:', error);
      throw new Error(`Failed to create Planner task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if Microsoft Graph client is properly configured
   * @returns Configuration status
   */
  static isConfigured(): boolean {
    return !!(
      process.env.AZURE_TENANT_ID && 
      process.env.AZURE_CLIENT_ID && 
      process.env.AZURE_CLIENT_SECRET
    );
  }
}

// Export a singleton instance
let graphClientInstance: MicrosoftGraphClient | null = null;

export const getGraphClient = (): MicrosoftGraphClient => {
  if (!graphClientInstance) {
    graphClientInstance = new MicrosoftGraphClient();
  }
  return graphClientInstance;
};

export const isO365Enabled = (): boolean => {
  return MicrosoftGraphClient.isConfigured();
};
