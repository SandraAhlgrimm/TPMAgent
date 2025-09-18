'use client'

import { useToast } from '@/app/utils/toast';

export function useO365Integration() {
  const { showToast } = useToast();

  const sendEmail = async (to: string[], subject: string, body: string, isHtml: boolean = true) => {
    try {
      const response = await fetch('/api/o365', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendEmail',
          params: { 
            recipients: to.map(email => ({ address: email })), 
            subject, 
            body, 
            isHtml 
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const message = result.data?.message || `Email "${subject}" sent to ${to.join(', ')}`;
        showToast(message, 'success');
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const createPresentation = async (title: string, slides: Array<{title: string, content: string}>) => {
    try {
      const response = await fetch('/api/o365', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createPresentation',
          params: { title, slides }
        })
      });

      const result = await response.json();

      if (response.ok) {
        showToast(
          `PowerPoint "${title}" created with ${slides.length} slides`,
          'success'
        );
        return { success: true, result };
      } else {
        throw new Error(result.error || 'Failed to create presentation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create presentation';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const scheduleMeeting = async (
    subject: string,
    startTime: Date,
    endTime: Date,
    attendees: string[],
    body?: string
  ) => {
    try {
      const response = await fetch('/api/o365', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createMeeting',
          params: { 
            subject, 
            startTime: startTime.toISOString(), 
            endTime: endTime.toISOString(), 
            attendees: attendees.map(email => ({ email })),
            body 
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const message = result.data?.message || `Meeting "${subject}" scheduled for ${startTime.toLocaleDateString()}`;
        showToast(message, 'success');
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule meeting';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const checkAvailability = async (attendees: string[], startTime: Date, endTime: Date) => {
    try {
      const response = await fetch('/api/o365', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getAvailability',
          params: { 
            attendees, 
            startTime: startTime.toISOString(), 
            endTime: endTime.toISOString() 
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        return { success: true, result };
      } else {
        throw new Error(result.error || 'Failed to check availability');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check availability';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  const createPlannerTask = async (
    title: string,
    planId: string,
    bucketId: string,
    assignedTo: string[],
    dueDate?: Date
  ) => {
    try {
      const response = await fetch('/api/o365', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createPlannerTask',
          params: { 
            title, 
            planId, 
            bucketId, 
            assignedTo, 
            dueDate: dueDate?.toISOString() 
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        showToast(
          `Task "${title}" created in Microsoft Planner`,
          'success'
        );
        return { success: true, result };
      } else {
        throw new Error(result.error || 'Failed to create Planner task');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Planner task';
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    }
  };

  return { 
    sendEmail, 
    createPresentation, 
    scheduleMeeting, 
    checkAvailability, 
    createPlannerTask 
  };
}