// SSB STUDENT PORTAL BACKEND - Google Apps Script
// This is a separate GAS project for the student-facing Firebase frontend

// Configuration constants - UPDATE THESE WITH YOUR ACTUAL VALUES
const SHEET_ID = "1K5DrHxTVignwR4841sYyzziLDNq-rw2lrlDNJWk_Ddk";
const MAIN_SHEET = "ALLINONE";
const STUDENT_DATA_SHEET = "Student Data";
const TIMEZONE = "Asia/Kolkata";

// Firebase configuration - UPDATE THESE AFTER SETTING UP FIREBASE
const FIREBASE_PROJECT_ID = "scaler-school-of-business";
const FIREBASE_WEB_API_KEY = "AIzaSyC3RVCSRVCXRzKv-XEKEj69AtP8mSRrZ-oKHwA";
const FIREBASE_WEBHOOK_URL = "https://scaler-school-of-business.firebaseapp.com/api/webhook";

/**
 * Main entry point for web app - handles all API requests
 * Deploy as web app with execute permissions: Anyone
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function doOptions(e) {
  // Handle preflight CORS requests - GAS handles CORS automatically when deployed as "Anyone"
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(e) {
  try {
    // Handle OPTIONS preflight request
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return doOptions(e);
    }

    const action = e.parameter.action;
    const studentEmail = e.parameter.studentEmail;

    // Validate student email (except for test action)
    if (action !== 'test' && (!studentEmail || !isValidStudentEmail(studentEmail))) {
      return createErrorResponse('Invalid or missing student email');
    }

    // Route to appropriate handler
    let result;
    switch (action) {
      case 'test':
        result = { success: true, message: 'SSB Student Portal Backend is working!' };
        break;
      case 'getDashboard':
      case 'getStudentDashboard':
        result = getStudentDashboard(studentEmail, e.parameter.lastSync);
        break;
      case 'getContentDetails':
        result = getContentDetails(e.parameter.contentId, studentEmail);
        break;
      case 'submitAcknowledgment':
        result = submitAcknowledgment(e.parameter.contentId, studentEmail, e.parameter.response);
        break;
      case 'getStudentProfile':
        result = getStudentProfile(studentEmail);
        break;
      case 'getUpcomingDeadlines':
        result = getUpcomingDeadlines(studentEmail);
        break;
      case 'markContentAsRead':
        result = markContentAsRead(e.parameter.contentId, studentEmail);
        break;
      default:
        return createErrorResponse('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('API Error: ' + error.message);
    return createErrorResponse('Server error: ' + error.message);
  }
}

/**
 * Validate student email domain
 */
function isValidStudentEmail(email) {
  return email && (email.endsWith('@ssb.scaler.com') || email.endsWith('@scaler.com'));
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(message) {
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  return ContentService.createTextOutput(JSON.stringify(errorResponse))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get student dashboard with content filtered for them
 * @param {string} studentEmail - Student's email address
 * @param {string} lastSync - ISO timestamp of last sync (optional)
 * @return {Object} Dashboard data
 */
function getStudentDashboard(studentEmail, lastSync) {
  try {
    Logger.log('Getting dashboard for student: ' + studentEmail);
    
    // Get student profile to determine batch and options
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      return studentProfile;
    }

    const student = studentProfile.data;
    
    // Get all content from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: {
          content: [],
          stats: {
            total: 0,
            active: 0,
            upcoming: 0,
            requiresAck: 0
          },
          student: student
        }
      };
    }

    const headers = data[0];
    const indices = getColumnIndices(headers);
    const now = new Date();
    const lastSyncDate = lastSync ? new Date(lastSync) : null;
    
    const filteredContent = [];
    const stats = { total: 0, active: 0, upcoming: 0, requiresAck: 0 };

    // Process each content item
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Calculate current status
      const startDateTime = parseDateTime(getValue(row, indices.startDateTime));
      const endDateTime = parseDateTime(getValue(row, indices.endDateTime));
      const currentStatus = calculateContentStatus(startDateTime, endDateTime);
      
      // Skip expired content older than 7 days
      if (currentStatus === 'Expired' && endDateTime) {
        const daysSinceExpired = (now - endDateTime) / (1000 * 60 * 60 * 24);
        if (daysSinceExpired > 7) continue;
      }

      // Check if content is targeted to this student
      const targetBatch = getValue(row, indices.targetBatch);
      const targetStudents = getValue(row, indices.targetStudents);
      
      if (!isContentTargetedToStudent(targetBatch, targetStudents, student)) {
        continue;
      }

      // If lastSync provided, only include content updated after that
      const createdAt = parseDateTime(getValue(row, indices.createdAt));
      const editedAt = parseDateTime(getValue(row, indices.editedAt));
      const lastModified = editedAt && editedAt > createdAt ? editedAt : createdAt;
      
      if (lastSyncDate && lastModified <= lastSyncDate) {
        continue;
      }

      // Create content item for dashboard
      const contentItem = {
        id: getValue(row, indices.id),
        category: getValue(row, indices.category),
        eventType: getValue(row, indices.eventType),
        title: getValue(row, indices.title),
        subTitle: getValue(row, indices.subTitle),
        priority: getValue(row, indices.priority),
        status: currentStatus,
        createdAt: formatDisplayDateTime(getValue(row, indices.createdAt)),
        startDateTime: formatDisplayDateTime(getValue(row, indices.startDateTime)),
        endDateTime: formatDisplayDateTime(getValue(row, indices.endDateTime)),
        requiresAcknowledgment: getValue(row, indices.requireAcknowledgment) === 'Yes',
        hasFiles: !!getValue(row, indices.fileURL),
        isNew: lastSyncDate && createdAt > lastSyncDate,
        daysUntilDeadline: endDateTime ? Math.ceil((endDateTime - now) / (1000 * 60 * 60 * 24)) : null
      };

      filteredContent.push(contentItem);
      
      // Update stats
      stats.total++;
      if (currentStatus === 'Active') stats.active++;
      if (currentStatus === 'Upcoming') stats.upcoming++;
      if (contentItem.requiresAcknowledgment) stats.requiresAck++;
    }

    // Sort by created date (newest first)
    filteredContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    Logger.log(`Dashboard loaded: ${filteredContent.length} items for ${studentEmail}`);
    
    return {
      success: true,
      data: {
        content: filteredContent,
        stats: stats,
        student: student,
        lastSync: new Date().toISOString()
      }
    };

  } catch (error) {
    Logger.log('Error in getStudentDashboard: ' + error.message);
    return {
      success: false,
      error: 'Failed to load dashboard: ' + error.message
    };
  }
}

/**
 * Get detailed content for a specific item
 * @param {string} contentId - Content ID
 * @param {string} studentEmail - Student's email
 * @return {Object} Content details
 */
function getContentDetails(contentId, studentEmail) {
  try {
    Logger.log(`Getting content details: ${contentId} for ${studentEmail}`);
    
    // Get student profile
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      return studentProfile;
    }

    const student = studentProfile.data;
    
    // Get content from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const indices = getColumnIndices(headers);
    
    // Find the content item
    for (let i = 1; i < data.length; i++) {
      if (data[i][indices.id] === contentId) {
        const row = data[i];
        
        // Verify student has access to this content
        const targetBatch = getValue(row, indices.targetBatch);
        const targetStudents = getValue(row, indices.targetStudents);
        
        if (!isContentTargetedToStudent(targetBatch, targetStudents, student)) {
          return {
            success: false,
            error: 'Access denied: Content not targeted to this student'
          };
        }

        // Calculate current status
        const startDateTime = parseDateTime(getValue(row, indices.startDateTime));
        const endDateTime = parseDateTime(getValue(row, indices.endDateTime));
        const currentStatus = calculateContentStatus(startDateTime, endDateTime);
        
        // Parse file URLs
        const fileURLs = getValue(row, indices.fileURL);
        const files = fileURLs ? fileURLs.split(',').map(url => ({
          url: url.trim(),
          name: extractFileNameFromUrl(url.trim())
        })).filter(file => file.url) : [];

        const contentDetails = {
          id: getValue(row, indices.id),
          category: getValue(row, indices.category),
          eventType: getValue(row, indices.eventType),
          title: getValue(row, indices.title),
          subTitle: getValue(row, indices.subTitle),
          content: getValue(row, indices.content),
          priority: getValue(row, indices.priority),
          status: currentStatus,
          postedBy: getValue(row, indices.postedBy),
          createdAt: formatDisplayDateTime(getValue(row, indices.createdAt)),
          startDateTime: formatDisplayDateTime(getValue(row, indices.startDateTime)),
          endDateTime: formatDisplayDateTime(getValue(row, indices.endDateTime)),
          targetBatch: getValue(row, indices.targetBatch),
          requiresAcknowledgment: getValue(row, indices.requireAcknowledgment) === 'Yes',
          driveLink: getValue(row, indices.driveLink),
          sheetsLink: getValue(row, indices.sheetsLink),
          files: files,
          daysUntilDeadline: endDateTime ? Math.ceil((endDateTime - new Date()) / (1000 * 60 * 60 * 24)) : null
        };

        Logger.log('Content details retrieved: ' + contentId);
        return {
          success: true,
          data: contentDetails
        };
      }
    }

    return {
      success: false,
      error: 'Content not found'
    };

  } catch (error) {
    Logger.log('Error in getContentDetails: ' + error.message);
    return {
      success: false,
      error: 'Failed to get content details: ' + error.message
    };
  }
}

/**
 * Submit acknowledgment for content
 * @param {string} contentId - Content ID
 * @param {string} studentEmail - Student's email
 * @param {string} response - Acknowledgment response (Yes/No)
 * @return {Object} Submission result
 */
function submitAcknowledgment(contentId, studentEmail, response) {
  try {
    Logger.log(`Submitting acknowledgment: ${contentId} from ${studentEmail} - ${response}`);
    
    // Get student profile
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      return studentProfile;
    }

    const student = studentProfile.data;
    
    // Get content details to find the acknowledgment sheet
    const contentDetails = getContentDetails(contentId, studentEmail);
    if (!contentDetails.success) {
      return contentDetails;
    }

    const content = contentDetails.data;
    
    if (!content.requiresAcknowledgment) {
      return {
        success: false,
        error: 'This content does not require acknowledgment'
      };
    }

    if (!content.sheetsLink) {
      return {
        success: false,
        error: 'Acknowledgment sheet not found'
      };
    }

    // Extract sheet ID from the sheets link
    const sheetIdMatch = content.sheetsLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return {
        success: false,
        error: 'Invalid acknowledgment sheet link'
      };
    }

    const ackSheetId = sheetIdMatch[1];
    const ackSheet = SpreadsheetApp.openById(ackSheetId).getActiveSheet();
    
    // Check if student has already acknowledged
    const existingData = ackSheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][1] === studentEmail) { // Column B is student email
        // Update existing acknowledgment
        const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
        ackSheet.getRange(i + 1, 1).setValue(timestamp); // Column A - Timestamp
        ackSheet.getRange(i + 1, 4).setValue(response);  // Column D - Acknowledge
        
        Logger.log('Updated existing acknowledgment for: ' + studentEmail);
        return {
          success: true,
          message: 'Acknowledgment updated successfully'
        };
      }
    }

    // Add new acknowledgment row
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    const newRow = [
      timestamp,           // Timestamp
      studentEmail,        // Student Email
      student.fullName,    // Student Name  
      response            // Acknowledge
    ];
    
    ackSheet.appendRow(newRow);
    
    Logger.log('New acknowledgment added for: ' + studentEmail);
    
    // Trigger Firebase notification for real-time update
    triggerFirebaseNotification('acknowledgment', {
      contentId: contentId,
      studentEmail: studentEmail,
      response: response,
      timestamp: timestamp
    });
    
    return {
      success: true,
      message: 'Acknowledgment submitted successfully'
    };

  } catch (error) {
    Logger.log('Error in submitAcknowledgment: ' + error.message);
    return {
      success: false,
      error: 'Failed to submit acknowledgment: ' + error.message
    };
  }
}

/**
 * Get student profile information
 * @param {string} studentEmail - Student's email
 * @return {Object} Student profile
 */
function getStudentProfile(studentEmail) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_DATA_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        error: 'No student data found'
      };
    }

    const headers = data[0];
    
    // Find the student
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentEmail) {
        const row = data[i];
        
        // Get all options for this student
        const options = [];
        for (let j = 4; j < headers.length; j++) { // Start from Options1 column
          const header = headers[j];
          const value = row[j];
          
          if (header && header.toLowerCase().startsWith('options') && value) {
            options.push(value.toString().trim());
          }
        }

        const studentProfile = {
          email: row[0],
          fullName: row[1] || '',
          rollNo: row[2] || '',
          batch: row[3] || '',
          options: options
        };

        return {
          success: true,
          data: studentProfile
        };
      }
    }

    return {
      success: false,
      error: 'Student not found in database'
    };

  } catch (error) {
    Logger.log('Error in getStudentProfile: ' + error.message);
    return {
      success: false,
      error: 'Failed to get student profile: ' + error.message
    };
  }
}

/**
 * Get upcoming deadlines for student
 * @param {string} studentEmail - Student's email
 * @return {Object} Upcoming deadlines
 */
function getUpcomingDeadlines(studentEmail) {
  try {
    const dashboardData = getStudentDashboard(studentEmail);
    if (!dashboardData.success) {
      return dashboardData;
    }

    const now = new Date();
    const upcomingDeadlines = dashboardData.data.content
      .filter(item => {
        const endDate = new Date(item.endDateTime);
        const daysUntil = (endDate - now) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 7; // Next 7 days
      })
      .sort((a, b) => new Date(a.endDateTime) - new Date(b.endDateTime))
      .slice(0, 10); // Top 10 upcoming

    return {
      success: true,
      data: upcomingDeadlines
    };

  } catch (error) {
    Logger.log('Error in getUpcomingDeadlines: ' + error.message);
    return {
      success: false,
      error: 'Failed to get upcoming deadlines: ' + error.message
    };
  }
}

/**
 * Mark content as read by student (for read tracking)
 * @param {string} contentId - Content ID
 * @param {string} studentEmail - Student's email
 * @return {Object} Result
 */
function markContentAsRead(contentId, studentEmail) {
  try {
    // This could be implemented to track read status
    // For now, just return success
    Logger.log(`Marking content as read: ${contentId} by ${studentEmail}`);
    
    return {
      success: true,
      message: 'Content marked as read'
    };

  } catch (error) {
    Logger.log('Error in markContentAsRead: ' + error.message);
    return {
      success: false,
      error: 'Failed to mark content as read: ' + error.message
    };
  }
}

// Helper Functions

/**
 * Check if content is targeted to a specific student
 * @param {string} targetBatch - Target batch from content
 * @param {string} targetStudents - Target students list from content
 * @param {Object} student - Student profile object
 * @return {boolean} Whether content is targeted to student
 */
function isContentTargetedToStudent(targetBatch, targetStudents, student) {
  // Check batch match
  if (targetBatch !== student.batch) {
    return false;
  }

  // If no specific targeting, it's for all students in the batch
  if (!targetStudents || targetStudents.trim() === '') {
    return true;
  }

  const targetList = targetStudents.split(',').map(t => t.trim().toLowerCase());
  
  // Check if student email is directly targeted
  if (targetList.includes(student.email.toLowerCase())) {
    return true;
  }

  // Check if any of student's options are targeted
  for (const option of student.options) {
    if (targetList.includes(option.toLowerCase())) {
      return true;
    }
  }

  // Check for "ALL STUDENTS" targeting
  const allStudentsPattern = `all students (${student.batch} batch)`.toLowerCase();
  if (targetList.includes(allStudentsPattern)) {
    return true;
  }

  return false;
}

/**
 * Parse datetime string to Date object
 * @param {string} dateTimeValue 
 * @return {Date|null}
 */
function parseDateTime(dateTimeValue) {
  if (!dateTimeValue) return null;
  
  try {
    if (typeof dateTimeValue === "string") {
      return new Date(dateTimeValue);
    } else if (dateTimeValue instanceof Date) {
      return dateTimeValue;
    } else {
      return new Date(dateTimeValue);
    }
  } catch (error) {
    Logger.log("Error parsing datetime: " + error.message);
    return null;
  }
}

/**
 * Calculate content status based on dates
 * @param {Date} startDateTime 
 * @param {Date} endDateTime 
 * @return {string}
 */
function calculateContentStatus(startDateTime, endDateTime) {
  const now = new Date();
  
  if (!startDateTime || !endDateTime) return "Draft";
  
  if (now < startDateTime) return "Upcoming";
  if (now >= startDateTime && now <= endDateTime) return "Active";
  return "Expired";
}

/**
 * Get column indices mapping
 * @param {Array} headers Array of header names
 * @return {Object} Column indices mapping
 */
function getColumnIndices(headers) {
  const indices = {};
  const mapping = {
    "ID": "id",
    "Category": "category", 
    "Event Type": "eventType",
    "Title": "title",
    "SubTitle": "subTitle",
    "Content": "content",
    "Posted By": "postedBy",
    "Created at": "createdAt",
    "StartDateTime": "startDateTime",
    "EndDateTime": "endDateTime", 
    "Status": "status",
    "Priority": "priority",
    "Target Batch": "targetBatch",
    "Target Student(s)": "targetStudents",
    "File URL": "fileURL",
    "Require Acknowledgment": "requireAcknowledgment",
    "Drive Link": "driveLink",
    "Fileupload Link": "fileuploadLink",
    "SheetsLink": "sheetsLink",
    "Edited AT": "editedAt"
  };
  
  headers.forEach((header, index) => {
    if (header && mapping[header]) {
      indices[mapping[header]] = index;
    }
  });
  
  return indices;
}

/**
 * Get value from row by index
 * @param {Array} row 
 * @param {number} index 
 * @return {string}
 */
function getValue(row, index) {
  if (index === undefined || index === null || index < 0 || index >= row.length) {
    return "";
  }
  
  const value = row[index];
  if (value === null || value === undefined) {
    return "";
  }
  
  return value.toString();
}

/**
 * Format datetime for display
 * @param {*} dateValue 
 * @return {string}
 */
function formatDisplayDateTime(dateValue) {
  if (!dateValue) return "";
  
  try {
    let date;
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) {
      return dateValue.toString();
    }
    
    return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd HH:mm");
  } catch (error) {
    Logger.log("Error formatting date: " + error.message);
    return dateValue.toString();
  }
}

/**
 * Extract file name from URL
 * @param {string} url 
 * @return {string}
 */
function extractFileNameFromUrl(url) {
  try {
    // Handle Google Drive URLs
    if (url.includes('drive.google.com')) {
      return 'Google Drive File';
    }
    
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    return fileName || 'File Link';
  } catch (error) {
    return 'File Link';
  }
}

/**
 * Trigger Firebase notification for real-time updates
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 */
function triggerFirebaseNotification(type, data) {
  try {
    // Only trigger if Firebase webhook URL is configured
    if (!FIREBASE_WEBHOOK_URL || FIREBASE_WEBHOOK_URL === 'https://your-firebase-project.firebaseapp.com/api/webhook') {
      Logger.log('Firebase webhook not configured, skipping notification');
      return;
    }

    const payload = {
      type: type,
      data: data,
      timestamp: new Date().toISOString()
    };

    const options = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(FIREBASE_WEBHOOK_URL, options);
    Logger.log('Firebase notification sent: ' + response.getContentText());

  } catch (error) {
    Logger.log('Error sending Firebase notification: ' + error.message);
    // Don't fail the main operation if notification fails
  }
}

/**
 * ADMIN FUNCTION: Trigger notification when new content is created
 * Call this from your admin script after saving content
 * @param {Object} contentData - Content that was created/updated
 */
function notifyStudentsOfNewContent(contentData) {
  try {
    Logger.log('Notifying students of new content: ' + contentData.id);
    
    // Get all students who should receive this content
    const targetedStudents = getTargetedStudents(contentData.targetBatch, contentData.targetStudents);
    
    // Trigger Firebase notification
    triggerFirebaseNotification('new_content', {
      contentId: contentData.id,
      title: contentData.title,
      category: contentData.category,
      eventType: contentData.eventType,
      priority: contentData.priority,
      targetedStudents: targetedStudents,
      requiresAcknowledgment: contentData.requireAcknowledgment,
      deadline: contentData.endDateTime
    });

    Logger.log(`Notification sent for content ${contentData.id} to ${targetedStudents.length} students`);

  } catch (error) {
    Logger.log('Error in notifyStudentsOfNewContent: ' + error.message);
  }
}

/**
 * Get list of students targeted by content
 * @param {string} targetBatch - Target batch
 * @param {string} targetStudents - Target students string
 * @return {Array} Array of student emails
 */
function getTargetedStudents(targetBatch, targetStudents) {
  try {
    const studentSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_DATA_SHEET);
    const studentData = studentSheet.getDataRange().getValues();
    const targetedEmails = [];

    // If no specific targeting, return all students in batch
    if (!targetStudents || targetStudents.trim() === '') {
      for (let i = 1; i < studentData.length; i++) {
        const email = studentData[i][0];
        const batch = studentData[i][3];
        
        if (batch === targetBatch && email) {
          targetedEmails.push(email);
        }
      }
      return targetedEmails;
    }

    // Parse target list
    const targetList = targetStudents.split(',').map(t => t.trim());

    // Check each student
    for (let i = 1; i < studentData.length; i++) {
      const email = studentData[i][0];
      const batch = studentData[i][3];
      
      if (batch === targetBatch && email) {
        const student = {
          email: email,
          batch: batch,
          options: []
        };

        // Get student options
        const headers = studentData[0];
        for (let j = 4; j < headers.length; j++) {
          const header = headers[j];
          const value = studentData[i][j];
          
          if (header && header.toLowerCase().startsWith('options') && value) {
            student.options.push(value.toString().trim());
          }
        }

        // Check if student is targeted
        if (isContentTargetedToStudent(targetBatch, targetStudents, student)) {
          targetedEmails.push(email);
        }
      }
    }

    return targetedEmails;

  } catch (error) {
    Logger.log('Error in getTargetedStudents: ' + error.message);
    return [];
  }
}


// SSB STUDENT PORTAL BACKEND - Additional Functions (Part 2)
// Add these functions to your Student Portal GAS project

/**
 * DEADLINE REMINDER SYSTEM
 * Set up time-driven triggers to send deadline reminders
 */

/**
 * Setup automatic deadline reminders
 * Run this once to create the triggers
 */
function setupDeadlineReminders() {
  try {
    // Delete existing triggers first
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkAndSendDeadlineReminders') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new trigger to run every 4 hours
    ScriptApp.newTrigger('checkAndSendDeadlineReminders')
      .timeBased()
      .everyHours(4)
      .create();

    Logger.log('Deadline reminder trigger setup successfully');
    return { success: true, message: 'Deadline reminders setup successfully' };

  } catch (error) {
    Logger.log('Error setting up deadline reminders: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check for upcoming deadlines and send notifications
 * This runs automatically via trigger
 */
function checkAndSendDeadlineReminders() {
  try {
    Logger.log('Checking for deadline reminders...');
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return;

    const headers = data[0];
    const indices = getColumnIndices(headers);
    const now = new Date();
    const reminderSent = [];

    // Check each content item
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const contentId = getValue(row, indices.id);
      const title = getValue(row, indices.title);
      const endDateTime = parseDateTime(getValue(row, indices.endDateTime));
      const targetBatch = getValue(row, indices.targetBatch);
      const targetStudents = getValue(row, indices.targetStudents);
      const priority = getValue(row, indices.priority);
      
      if (!endDateTime) continue;

      // Calculate hours until deadline
      const hoursUntilDeadline = (endDateTime - now) / (1000 * 60 * 60);
      
      // Send reminder if deadline is within 24 hours and content is still active
      if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
        const currentStatus = calculateContentStatus(
          parseDateTime(getValue(row, indices.startDateTime)), 
          endDateTime
        );
        
        if (currentStatus === 'Active') {
          // Get targeted students
          const targetedStudents = getTargetedStudents(targetBatch, targetStudents);
          
          if (targetedStudents.length > 0) {
            // Send Firebase notification for deadline reminder
            triggerFirebaseNotification('deadline_reminder', {
              contentId: contentId,
              title: title,
              priority: priority,
              hoursRemaining: Math.ceil(hoursUntilDeadline),
              deadline: endDateTime.toISOString(),
              targetedStudents: targetedStudents
            });

            reminderSent.push({
              contentId: contentId,
              title: title,
              studentsCount: targetedStudents.length,
              hoursRemaining: Math.ceil(hoursUntilDeadline)
            });
          }
        }
      }
    }

    Logger.log(`Deadline reminders sent for ${reminderSent.length} content items`);
    return { success: true, remindersSent: reminderSent };

  } catch (error) {
    Logger.log('Error in checkAndSendDeadlineReminders: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * BULK OPERATIONS FOR STUDENTS
 */

/**
 * Get content summary for multiple students (for admin analytics)
 * @param {Array} studentEmails - Array of student emails
 * @return {Object} Summary data
 */
function getBulkStudentSummary(studentEmails) {
  try {
    const summary = {
      totalStudents: studentEmails.length,
      studentsWithContent: 0,
      contentStats: {
        total: 0,
        active: 0,
        upcoming: 0,
        expired: 0,
        requiresAck: 0
      },
      acknowledgmentStats: {
        totalRequired: 0,
        completed: 0,
        pending: 0
      }
    };

    const studentSummaries = [];

    studentEmails.forEach(email => {
      const dashboard = getStudentDashboard(email);
      if (dashboard.success && dashboard.data.content.length > 0) {
        summary.studentsWithContent++;
        summary.contentStats.total += dashboard.data.stats.total;
        summary.contentStats.active += dashboard.data.stats.active;
        summary.contentStats.upcoming += dashboard.data.stats.upcoming;
        summary.contentStats.requiresAck += dashboard.data.stats.requiresAck;

        studentSummaries.push({
          email: email,
          name: dashboard.data.student.fullName,
          batch: dashboard.data.student.batch,
          contentCount: dashboard.data.stats.total,
          acknowledgementsRequired: dashboard.data.stats.requiresAck
        });
      }
    });

    return {
      success: true,
      data: {
        summary: summary,
        studentDetails: studentSummaries
      }
    };

  } catch (error) {
    Logger.log('Error in getBulkStudentSummary: ' + error.message);
    return {
      success: false,
      error: 'Failed to get bulk summary: ' + error.message
    };
  }
}

/**
 * CONTENT ANALYTICS FOR STUDENTS
 */

/**
 * Get student engagement analytics
 * @param {string} studentEmail - Student's email
 * @return {Object} Analytics data
 */
function getStudentAnalytics(studentEmail) {
  try {
    const dashboard = getStudentDashboard(studentEmail);
    if (!dashboard.success) {
      return dashboard;
    }

    const content = dashboard.data.content;
    const now = new Date();
    
    // Calculate analytics
    const analytics = {
      overview: {
        totalContent: content.length,
        activeContent: content.filter(c => c.status === 'Active').length,
        upcomingContent: content.filter(c => c.status === 'Upcoming').length,
        expiredContent: content.filter(c => c.status === 'Expired').length
      },
      
      byCategory: {},
      byEventType: {},
      byPriority: {
        High: content.filter(c => c.priority === 'High').length,
        Medium: content.filter(c => c.priority === 'Medium').length,
        Low: content.filter(c => c.priority === 'Low').length
      },
      
      acknowledgments: {
        required: content.filter(c => c.requiresAcknowledgment).length,
        // Note: Tracking actual acknowledgment completion would require additional logic
      },
      
      upcomingDeadlines: content
        .filter(c => {
          const deadline = new Date(c.endDateTime);
          const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
          return daysUntil > 0 && daysUntil <= 7;
        })
        .sort((a, b) => new Date(a.endDateTime) - new Date(b.endDateTime)),
      
      recentActivity: content
        .filter(c => {
          const created = new Date(c.createdAt);
          const daysAgo = (now - created) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };

    // Calculate category breakdown
    content.forEach(item => {
      analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1;
      analytics.byEventType[item.eventType] = (analytics.byEventType[item.eventType] || 0) + 1;
    });

    return {
      success: true,
      data: analytics
    };

  } catch (error) {
    Logger.log('Error in getStudentAnalytics: ' + error.message);
    return {
      success: false,
      error: 'Failed to get analytics: ' + error.message
    };
  }
}

/**
 * ADVANCED CONTENT FILTERING
 */

/**
 * Get filtered content for student with advanced options
 * @param {string} studentEmail - Student's email
 * @param {Object} filters - Filter options
 * @return {Object} Filtered content
 */
function getFilteredStudentContent(studentEmail, filters = {}) {
  try {
    const dashboard = getStudentDashboard(studentEmail);
    if (!dashboard.success) {
      return dashboard;
    }

    let content = dashboard.data.content;

    // Apply filters
    if (filters.category) {
      content = content.filter(item => item.category === filters.category);
    }

    if (filters.eventType) {
      content = content.filter(item => item.eventType === filters.eventType);
    }

    if (filters.status) {
      content = content.filter(item => item.status === filters.status);
    }

    if (filters.priority) {
      content = content.filter(item => item.priority === filters.priority);
    }

    if (filters.requiresAcknowledgment !== undefined) {
      content = content.filter(item => item.requiresAcknowledgment === filters.requiresAcknowledgment);
    }

    if (filters.hasFiles !== undefined) {
      content = content.filter(item => item.hasFiles === filters.hasFiles);
    }

    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      content = content.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      content = content.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.subTitle.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm) ||
        item.eventType.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      const sortField = filters.sortBy;
      const sortOrder = filters.sortOrder || 'desc';
      
      content.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle date sorting
        if (sortField.includes('DateTime') || sortField === 'createdAt') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Apply pagination
    if (filters.page && filters.pageSize) {
      const startIndex = (filters.page - 1) * filters.pageSize;
      const endIndex = startIndex + filters.pageSize;
      content = content.slice(startIndex, endIndex);
    }

    return {
      success: true,
      data: {
        content: content,
        totalCount: dashboard.data.content.length,
        filteredCount: content.length,
        filters: filters
      }
    };

  } catch (error) {
    Logger.log('Error in getFilteredStudentContent: ' + error.message);
    return {
      success: false,
      error: 'Failed to filter content: ' + error.message
    };
  }
}

/**
 * NOTIFICATION PREFERENCES (Future Enhancement)
 */

/**
 * Get student notification preferences
 * @param {string} studentEmail - Student's email
 * @return {Object} Notification preferences
 */
function getNotificationPreferences(studentEmail) {
  try {
    // For now, return default preferences
    // In future, this could be stored in a separate sheet
    const defaultPreferences = {
      email: studentEmail,
      preferences: {
        newContent: true,
        deadlineReminders: true,
        acknowledgmentRequests: true,
        weeklyDigest: false,
        pushNotifications: true,
        emailNotifications: false
      },
      reminderTiming: {
        deadlineHours: [24, 6], // Remind 24h and 6h before deadline
        dailyDigestTime: '09:00' // 9 AM IST
      }
    };

    return {
      success: true,
      data: defaultPreferences
    };

  } catch (error) {
    Logger.log('Error in getNotificationPreferences: ' + error.message);
    return {
      success: false,
      error: 'Failed to get notification preferences: ' + error.message
    };
  }
}

/**
 * Update student notification preferences
 * @param {string} studentEmail - Student's email
 * @param {Object} preferences - New preferences
 * @return {Object} Update result
 */
function updateNotificationPreferences(studentEmail, preferences) {
  try {
    // For now, just log the preferences
    // In future, save to a preferences sheet
    Logger.log(`Updating preferences for ${studentEmail}: ${JSON.stringify(preferences)}`);

    return {
      success: true,
      message: 'Notification preferences updated successfully'
    };

  } catch (error) {
    Logger.log('Error in updateNotificationPreferences: ' + error.message);
    return {
      success: false,
      error: 'Failed to update preferences: ' + error.message
    };
  }
}

/**
 * INTEGRATION HELPERS
 */

/**
 * Get API health status and configuration
 * @return {Object} Health status
 */
function getAPIHealth() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        googleSheets: 'connected',
        firebase: FIREBASE_WEBHOOK_URL !== 'https://your-firebase-project.firebaseapp.com/api/webhook' ? 'configured' : 'not_configured',
        triggers: ScriptApp.getProjectTriggers().length > 0 ? 'active' : 'inactive'
      },
      configuration: {
        sheetId: SHEET_ID ? 'configured' : 'missing',
        timezone: TIMEZONE,
        webAppUrl: ScriptApp.getService().getUrl()
      }
    };

    // Test sheet access
    try {
      const sheet = SpreadsheetApp.openById(SHEET_ID);
      const mainSheet = sheet.getSheetByName(MAIN_SHEET);
      health.services.googleSheets = 'connected';
      health.dataInfo = {
        totalContentItems: mainSheet.getLastRow() - 1, // Subtract header row
        lastUpdated: new Date().toISOString()
      };
    } catch (sheetError) {
      health.services.googleSheets = 'error: ' + sheetError.message;
      health.status = 'degraded';
    }

    return {
      success: true,
      data: health
    };

  } catch (error) {
    return {
      success: false,
      error: 'Health check failed: ' + error.message,
      status: 'unhealthy'
    };
  }
}

/**
 * Get available categories and event types for frontend dropdowns
 * @return {Object} Categories and types
 */
function getAvailableFilters() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: {
          categories: [],
          eventTypes: [],
          priorities: ['High', 'Medium', 'Low'],
          statuses: ['Active', 'Upcoming', 'Expired']
        }
      };
    }

    const headers = data[0];
    const indices = getColumnIndices(headers);
    
    const categories = new Set();
    const eventTypes = new Set();

    // Collect unique values from all content
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const category = getValue(row, indices.category);
      const eventType = getValue(row, indices.eventType);
      
      if (category) categories.add(category);
      if (eventType) eventTypes.add(eventType);
    }

    return {
      success: true,
      data: {
        categories: Array.from(categories).sort(),
        eventTypes: Array.from(eventTypes).sort(),
        priorities: ['High', 'Medium', 'Low'],
        statuses: ['Active', 'Upcoming', 'Expired']
      }
    };

  } catch (error) {
    Logger.log('Error in getAvailableFilters: ' + error.message);
    return {
      success: false,
      error: 'Failed to get available filters: ' + error.message
    };
  }
}

/**
 * ADMIN INTEGRATION FUNCTIONS
 * These functions should be called from your admin script
 */

/**
 * Notify students when content is updated (call from admin script)
 * @param {string} contentId - Content ID that was updated
 * @param {Object} changes - What was changed
 */
function notifyStudentsOfContentUpdate(contentId, changes) {
  try {
    Logger.log('Notifying students of content update: ' + contentId);
    
    // Get content details
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const indices = getColumnIndices(headers);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][indices.id] === contentId) {
        const row = data[i];
        const targetBatch = getValue(row, indices.targetBatch);
        const targetStudents = getValue(row, indices.targetStudents);
        const title = getValue(row, indices.title);
        
        const targetedStudents = getTargetedStudents(targetBatch, targetStudents);
        
        triggerFirebaseNotification('content_updated', {
          contentId: contentId,
          title: title,
          changes: changes,
          targetedStudents: targetedStudents
        });
        
        Logger.log(`Update notification sent for content ${contentId} to ${targetedStudents.length} students`);
        break;
      }
    }

  } catch (error) {
    Logger.log('Error in notifyStudentsOfContentUpdate: ' + error.message);
  }
}

/**
 * Get content interaction summary for admin dashboard
 * @param {string} contentId - Content ID
 * @return {Object} Interaction summary
 */
function getContentInteractionSummary(contentId) {
  try {
    // Get content details
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const indices = getColumnIndices(headers);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][indices.id] === contentId) {
        const row = data[i];
        const targetBatch = getValue(row, indices.targetBatch);
        const targetStudents = getValue(row, indices.targetStudents);
        const requiresAck = getValue(row, indices.requireAcknowledgment) === 'Yes';
        const sheetsLink = getValue(row, indices.sheetsLink);
        
        const targetedStudents = getTargetedStudents(targetBatch, targetStudents);
        
        const summary = {
          contentId: contentId,
          targetedStudentsCount: targetedStudents.length,
          requiresAcknowledgment: requiresAck,
          acknowledgmentStats: {
            total: 0,
            completed: 0,
            pending: 0
          }
        };

        // If requires acknowledgment, get stats from the acknowledgment sheet
        if (requiresAck && sheetsLink) {
          try {
            const sheetIdMatch = sheetsLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (sheetIdMatch) {
              const ackSheetId = sheetIdMatch[1];
              const ackSheet = SpreadsheetApp.openById(ackSheetId).getActiveSheet();
              const ackData = ackSheet.getDataRange().getValues();
              
              summary.acknowledgmentStats.total = targetedStudents.length;
              summary.acknowledgmentStats.completed = ackData.length - 1; // Subtract header
              summary.acknowledgmentStats.pending = summary.acknowledgmentStats.total - summary.acknowledgmentStats.completed;
            }
          } catch (ackError) {
            Logger.log('Error getting acknowledgment stats: ' + ackError.message);
          }
        }

        return {
          success: true,
          data: summary
        };
      }
    }

    return {
      success: false,
      error: 'Content not found'
    };

  } catch (error) {
    Logger.log('Error in getContentInteractionSummary: ' + error.message);
    return {
      success: false,
      error: 'Failed to get interaction summary: ' + error.message
    };
  }
}