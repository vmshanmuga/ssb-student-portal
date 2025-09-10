// SSB STUDENT PORTAL BACKEND - Google Apps Script
// This is a separate GAS project for the student-facing Firebase frontend

// Configuration constants - UPDATE THESE WITH YOUR ACTUAL VALUES
const SHEET_ID = "1K5DrHxTVignwR4841sYyzziLDNq-rw2lrlDNJWk_Ddk";
const MAIN_SHEET = "ALLINONE";
const STUDENT_LOGIN_SHEET = "Student Login";
const STUDENT_DATA_SHEET = "Student Data";
const STUDENT_PROFILE_SHEET = "Student Profile";
const ACKNOWLEDGEMENT_SHEET = "Acknowledgement Data";
const TIMEZONE = "Asia/Kolkata";

// Google Drive configuration for profile pictures
const MAIN_DRIVE_FOLDER_ID = "1nBvZpPA_pA4-LVd1xV7rnzRI5j1ikAfv";
const MAIN_DRIVE_FOLDER_NAME = "SSB ALL IN ONE CREATOR";

// ImgBB API configuration for public image hosting
// Get your free API key from: https://api.imgbb.com/
const IMGBB_API_KEY = "bcfa113ac09271460674c2e617d293a2"; // Your ImgBB API key
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

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
    // Handle undefined event parameter
    if (!e) {
      Logger.log('Error: Event parameter is undefined');
      return createErrorResponse('Invalid request - no parameters received');
    }
    
    // Handle OPTIONS preflight request
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return doOptions(e);
    }

    // Handle both GET and POST parameters
    let params = e.parameter || {};
    
    // For POST requests, also check postData
    if (e.postData) {
      Logger.log('POST data type: ' + e.postData.type);
      Logger.log('POST data contents length: ' + (e.postData.contents ? e.postData.contents.length : 0));
      
      // If it's form data, parse parameters from contents
      if (e.postData.type.includes('multipart/form-data')) {
        const boundary = e.postData.type.split('boundary=')[1];
        if (boundary && e.postData.contents) {
          const formData = parseMultipartFormData(e.postData.contents, boundary);
          params = { ...params, ...formData };
          Logger.log('Parsed form data keys: ' + Object.keys(formData).join(', '));
        }
      } else if (e.postData.type === 'application/x-www-form-urlencoded') {
        // Parse URL encoded form data
        const postParams = e.postData.contents.split('&');
        for (const param of postParams) {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        }
      }
    }

    const action = params.action;
    const studentEmail = params.studentEmail;
    
    Logger.log('Action: ' + action);
    Logger.log('Student Email: ' + studentEmail);

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
      case 'getFullStudentProfile':
        result = getFullStudentProfile(studentEmail);
        break;
      case 'updateStudentProfile':
        result = updateStudentProfile(studentEmail, JSON.parse(e.parameter.profileData || '{}'));
        break;
      case 'getUpcomingDeadlines':
        result = getUpcomingDeadlines(studentEmail);
        break;
      case 'markContentAsRead':
        result = markContentAsRead(e.parameter.contentId, studentEmail);
        break;
      case 'uploadProfilePicture':
        result = uploadProfilePicture(studentEmail, params.imageData, params.fileName, params.mimeType);
        break;
      case 'getDashboardLinks':
        result = getDashboardLinks(studentEmail);
        break;
      case 'getStudentSchedule':
        result = getStudentSchedule(studentEmail, params.startDate, params.endDate);
        break;
      case 'getPoliciesAndDocuments':
        result = getPoliciesAndDocuments(studentEmail);
        break;
      case 'getCourseResources':
        result = getCourseResources(studentEmail);
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
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet - need at least headers and one data row');
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

    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    const now = new Date();
    const lastSyncDate = lastSync ? new Date(lastSync) : null;
    
    Logger.log(`Student Dashboard - Headers: ${headers.length} columns, Data rows: ${data.length - 2}`);
    Logger.log(`Column indices mapped: ${Object.keys(indices).length} fields`);
    
    const filteredContent = [];
    const stats = { total: 0, active: 0, upcoming: 0, requiresAck: 0 };

    // Process each content item (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Skip unpublished content
      const publish = getValue(row, indices.publish);
      if (publish !== 'Yes') continue;
      
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

      // Create base content item for dashboard
      const contentItem = {
        id: getValue(row, indices.id),
        category: getValue(row, indices.category),
        eventType: getValue(row, indices.eventType),
        title: getValue(row, indices.title),
        subTitle: getValue(row, indices.subTitle),
        content: getValue(row, indices.content),
        priority: getValue(row, indices.priority),
        status: currentStatus,
        term: getValue(row, indices.term),
        subject: getValue(row, indices.subject),
        groups: getValue(row, indices.groups),
        postedBy: getValue(row, indices.postedBy),
        createdAt: parseDateTime(getValue(row, indices.createdAt))?.toISOString() || null,
        startDateTime: parseDateTime(getValue(row, indices.startDateTime))?.toISOString() || null,
        endDateTime: parseDateTime(getValue(row, indices.endDateTime))?.toISOString() || null,
        targetBatch: getValue(row, indices.targetBatch),
        requiresAcknowledgment: getValue(row, indices.requireAcknowledgment) === 'Yes',
        driveLink: getValue(row, indices.driveLink),
        sheetsLink: getValue(row, indices.sheetsLink),
        hasFiles: !!getValue(row, indices.fileURL),
        isNew: lastSyncDate && createdAt > lastSyncDate,
        daysUntilDeadline: endDateTime ? Math.ceil((endDateTime - now) / (1000 * 60 * 60 * 24)) : null
      };

      // Add category-specific fields based on category
      const category = getValue(row, indices.category);
      
      // Add acknowledgment status for ANNOUNCEMENTS and EVENTS
      if ((category === 'ANNOUNCEMENTS' || category === 'EVENTS') && contentItem.requiresAcknowledgment) {
        const ackStatus = getAcknowledgmentStatus(contentItem.id, studentEmail);
        contentItem.isAcknowledged = ackStatus.isAcknowledged;
        contentItem.acknowledgmentTimestamp = ackStatus.acknowledgmentTimestamp;
      } else {
        contentItem.isAcknowledged = false;
        contentItem.acknowledgmentTimestamp = null;
      }
      
      switch (category) {
        case 'ASSIGNMENTS & TASKS':
          contentItem.instructions = getValue(row, indices.instructions);
          contentItem.maxPoints = getValue(row, indices.maxPoints);
          contentItem.submissionGuidelines = getValue(row, indices.submissionGuidelines);
          contentItem.rubricLink = getValue(row, indices.rubricLink);
          contentItem.groupSize = getValue(row, indices.groupSize);
          break;
          
        case 'ANNOUNCEMENTS':
          contentItem.messageDetails = getValue(row, indices.messageDetails);
          contentItem.callToAction = getValue(row, indices.callToAction);
          contentItem.readTracking = getValue(row, indices.readTracking);
          break;
          
        case 'EVENTS':
          contentItem.eventTitle = getValue(row, indices.eventTitle);
          contentItem.eventLocation = getValue(row, indices.eventLocation);
          contentItem.eventAgenda = getValue(row, indices.eventAgenda);
          contentItem.speakerInfo = getValue(row, indices.speakerInfo);
          break;
          
        case 'COURSE MATERIAL':
          contentItem.learningObjectives = getValue(row, indices.learningObjectives);
          contentItem.prerequisites = getValue(row, indices.prerequisites);
          break;
          
        case 'POLICY & DOCUMENTS':
          contentItem.policyType = getValue(row, indices.policyType);
          contentItem.policyName = getValue(row, indices.policyName);
          contentItem.policyContent = getValue(row, indices.policyContent);
          break;
          
        case 'FORMS':
          contentItem.formDescription = getValue(row, indices.formDescription);
          contentItem.formLink = getValue(row, indices.formLink);
          break;
      }

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
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet for content details');
      return {
        success: false,
        error: 'No content data found'
      };
    }
    
    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    Logger.log(`Content Details - Headers: ${headers.length} columns, Data rows: ${data.length - 2}`);
    
    // Find the content item (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
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

        // Create base content details
        const contentDetails = {
          id: getValue(row, indices.id),
          category: getValue(row, indices.category),
          eventType: getValue(row, indices.eventType),
          title: getValue(row, indices.title),
          subTitle: getValue(row, indices.subTitle),
          content: getValue(row, indices.content),
          priority: getValue(row, indices.priority),
          status: currentStatus,
          term: getValue(row, indices.term),
          domain: getValue(row, indices.domain),
          subject: getValue(row, indices.subject),
          groups: getValue(row, indices.groups),
          postedBy: getValue(row, indices.postedBy),
          createdAt: parseDateTime(getValue(row, indices.createdAt))?.toISOString() || null,
          editedAt: parseDateTime(getValue(row, indices.editedAt))?.toISOString() || null,
          editedBy: getValue(row, indices.editedBy),
          startDateTime: parseDateTime(getValue(row, indices.startDateTime))?.toISOString() || null,
          endDateTime: parseDateTime(getValue(row, indices.endDateTime))?.toISOString() || null,
          targetBatch: getValue(row, indices.targetBatch),
          targetStudents: getValue(row, indices.targetStudents),
          requiresAcknowledgment: getValue(row, indices.requireAcknowledgment) === 'Yes',
          driveLink: getValue(row, indices.driveLink),
          sheetsLink: getValue(row, indices.sheetsLink),
          fileuploadLink: getValue(row, indices.fileuploadLink),
          files: files,
          daysUntilDeadline: endDateTime ? Math.ceil((endDateTime - new Date()) / (1000 * 60 * 60 * 24)) : null
        };

        // Add category-specific fields based on category
        const category = getValue(row, indices.category);
        
        switch (category) {
          case 'ASSIGNMENTS & TASKS':
            contentDetails.instructions = getValue(row, indices.instructions);
            contentDetails.maxPoints = getValue(row, indices.maxPoints);
            contentDetails.submissionGuidelines = getValue(row, indices.submissionGuidelines);
            contentDetails.rubricLink = getValue(row, indices.rubricLink);
            contentDetails.groupSize = getValue(row, indices.groupSize);
            break;
            
          case 'ANNOUNCEMENTS':
            contentDetails.messageDetails = getValue(row, indices.messageDetails);
            contentDetails.callToAction = getValue(row, indices.callToAction);
            contentDetails.readTracking = getValue(row, indices.readTracking);
            break;
            
          case 'EVENTS':
            contentDetails.eventTitle = getValue(row, indices.eventTitle);
            contentDetails.eventLocation = getValue(row, indices.eventLocation);
            contentDetails.eventAgenda = getValue(row, indices.eventAgenda);
            contentDetails.speakerInfo = getValue(row, indices.speakerInfo);
            break;
            
          case 'COURSE MATERIAL':
            contentDetails.learningObjectives = getValue(row, indices.learningObjectives);
            contentDetails.prerequisites = getValue(row, indices.prerequisites);
            break;
            
          case 'POLICY & DOCUMENTS':
            contentDetails.policyType = getValue(row, indices.policyType);
            contentDetails.policyName = getValue(row, indices.policyName);
            contentDetails.policyContent = getValue(row, indices.policyContent);
            break;
            
          case 'FORMS':
            contentDetails.formDescription = getValue(row, indices.formDescription);
            contentDetails.formLink = getValue(row, indices.formLink);
            break;
            
          case 'DASHBOARDS':
            contentDetails.dashboardName = getValue(row, indices.dashboardName);
            contentDetails.dashboardLink = getValue(row, indices.dashboardLink);
            contentDetails.dashboardDescription = getValue(row, indices.dashboardDescription);
            contentDetails.dashboardSop = getValue(row, indices.dashboardSop);
            contentDetails.dashboardVisibility = getValue(row, indices.dashboardVisibility);
            break;
        }

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
    
    // Get content details to validate acknowledgment requirement
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

    // Use centralized acknowledgment sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ackSheet = ss.getSheetByName(ACKNOWLEDGEMENT_SHEET);
    
    if (!ackSheet) {
      return {
        success: false,
        error: 'Acknowledgment sheet not found'
      };
    }
    
    // Check if student has already acknowledged this content
    const existingData = ackSheet.getDataRange().getValues();
    const headers = existingData[0];
    
    // Find column indices
    const idIndex = headers.indexOf('S.ID');
    const categoryIndex = headers.indexOf('S.Category');
    const timestampIndex = headers.indexOf('Timestamp');
    const emailIndex = headers.indexOf('Student Email');
    const nameIndex = headers.indexOf('Full Name');
    
    // Check for existing acknowledgment
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      if (row[idIndex] === contentId && row[emailIndex] === studentEmail) {
        // Update existing acknowledgment
        const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
        ackSheet.getRange(i + 1, timestampIndex + 1).setValue(timestamp);
        
        Logger.log('Updated existing acknowledgment for: ' + studentEmail);
        return {
          success: true,
          message: 'Acknowledgment updated successfully'
        };
      }
    }

    // Add new acknowledgment row
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    const newRow = [];
    
    // Initialize all columns to empty
    for (let i = 0; i < headers.length; i++) {
      newRow[i] = '';
    }
    
    // Fill in the data
    if (idIndex >= 0) newRow[idIndex] = contentId;
    if (categoryIndex >= 0) newRow[categoryIndex] = content.category;
    if (timestampIndex >= 0) newRow[timestampIndex] = timestamp;
    if (emailIndex >= 0) newRow[emailIndex] = studentEmail;
    if (nameIndex >= 0) newRow[nameIndex] = student.fullName;
    
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
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_LOGIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        error: 'No student login data found'
      };
    }

    const headers = data[0];
    
    // Find the student in Student Login sheet
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentEmail) {
        const row = data[i];
        
        const studentProfile = {
          email: row[0],
          fullName: row[1] || '',
          rollNo: row[2] || '',
          batch: row[3] || '',
          options: [] // Initialize empty options array to prevent errors
        };

        return {
          success: true,
          data: studentProfile
        };
      }
    }

    return {
      success: false,
      error: 'Student not found in login database'
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
 * Get full student profile from Student Profile sheet
 * @param {string} studentEmail - Student's email
 * @return {Object} Full student profile with extended fields
 */
function getFullStudentProfile(studentEmail) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_PROFILE_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        error: 'No student profile data found'
      };
    }

    const headers = data[0];
    
    // Find the student in Student Profile sheet
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentEmail) {
        const row = data[i];
        
        const fullProfile = {
          email: row[0] || '',
          fullName: row[1] || '',
          rollNo: row[2] || '',
          batch: row[3] || '',
          aboutMe: row[4] || '',
          phoneNo: row[5] || '',
          currentLocation: row[6] || '',
          linkedIn: row[7] || '',
          portfolioLink: row[8] || '',
          github: row[9] || '',
          undergraduateCollege: row[10] || '',
          undergraduateStream: row[11] || '',
          graduationYear: row[12] || '',
          previousCompany: row[13] || '',
          previousRole: row[14] || '',
          previousDuration: row[15] || '',
          techSkills: row[16] || '',
          softSkills: row[17] || '',
          achievements: row[18] || '',
          certifications: row[19] || '',
          interests: row[20] || '',
          languages: row[21] || '',
          profilePicture: row[22] || ''
        };

        return {
          success: true,
          data: fullProfile
        };
      }
    }

    // If student not found in profile sheet, create a new row with basic info from login sheet
    const loginResult = getStudentProfile(studentEmail);
    if (loginResult.success) {
      const basicProfile = {
        email: loginResult.data.email,
        fullName: loginResult.data.fullName,
        rollNo: loginResult.data.rollNo,
        batch: loginResult.data.batch,
        aboutMe: '',
        phoneNo: '',
        currentLocation: '',
        linkedIn: '',
        portfolioLink: '',
        github: '',
        undergraduateCollege: '',
        undergraduateStream: '',
        graduationYear: '',
        previousCompany: '',
        previousRole: '',
        previousDuration: '',
        techSkills: '',
        softSkills: '',
        achievements: '',
        certifications: '',
        interests: '',
        languages: '',
        profilePicture: ''
      };

      // Add the student to the profile sheet
      const newRow = [
        basicProfile.email,
        basicProfile.fullName,
        basicProfile.rollNo,
        basicProfile.batch,
        basicProfile.aboutMe,
        basicProfile.phoneNo,
        basicProfile.currentLocation,
        basicProfile.linkedIn,
        basicProfile.portfolioLink,
        basicProfile.github,
        basicProfile.undergraduateCollege,
        basicProfile.undergraduateStream,
        basicProfile.graduationYear,
        basicProfile.previousCompany,
        basicProfile.previousRole,
        basicProfile.previousDuration,
        basicProfile.techSkills,
        basicProfile.softSkills,
        basicProfile.achievements,
        basicProfile.certifications,
        basicProfile.interests,
        basicProfile.languages,
        basicProfile.profilePicture
      ];
      
      sheet.appendRow(newRow);

      return {
        success: true,
        data: basicProfile
      };
    }

    return {
      success: false,
      error: 'Student not found in login database'
    };

  } catch (error) {
    Logger.log('Error in getFullStudentProfile: ' + error.message);
    return {
      success: false,
      error: 'Failed to get full student profile: ' + error.message
    };
  }
}

/**
 * Update student profile in Student Profile sheet
 * @param {string} studentEmail - Student's email
 * @param {Object} profileData - Profile data to update
 * @return {Object} Result
 */
function updateStudentProfile(studentEmail, profileData) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_PROFILE_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        error: 'No student profile data found'
      };
    }

    const headers = data[0];
    let rowIndex = -1;
    
    // Find the student in Student Profile sheet
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentEmail) {
        rowIndex = i;
        break;
      }
    }

    // If student not found, try to add them from login data
    if (rowIndex === -1) {
      const loginResult = getStudentProfile(studentEmail);
      if (!loginResult.success) {
        return {
          success: false,
          error: 'Student not found in login database'
        };
      }

      // Add new row with basic info
      const newRow = [
        studentEmail,
        loginResult.data.fullName || '',
        loginResult.data.rollNo || '',
        loginResult.data.batch || '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '' // Empty profile fields
      ];
      
      sheet.appendRow(newRow);
      rowIndex = sheet.getLastRow() - 1; // Convert to 0-based index
    }

    // Update the profile data (keep first 4 columns from existing data - read-only)
    const updatedRow = [
      studentEmail, // Email (column 0) - read-only
      data[rowIndex][1] || '', // Full Name (column 1) - read-only from login sheet
      data[rowIndex][2] || '', // Roll No (column 2) - read-only from login sheet
      data[rowIndex][3] || '', // Batch (column 3) - read-only from login sheet
      profileData.aboutMe !== undefined ? profileData.aboutMe : (data[rowIndex][4] || ''), // About Me (column 4)
      profileData.phoneNo !== undefined ? profileData.phoneNo : (data[rowIndex][5] || ''), // Phone No (column 5)
      profileData.currentLocation !== undefined ? profileData.currentLocation : (data[rowIndex][6] || ''), // Current Location (column 6)
      profileData.linkedIn !== undefined ? profileData.linkedIn : (data[rowIndex][7] || ''), // LinkedIn (column 7)
      profileData.portfolioLink !== undefined ? profileData.portfolioLink : (data[rowIndex][8] || ''), // Portfolio Link (column 8)
      profileData.github !== undefined ? profileData.github : (data[rowIndex][9] || ''), // GitHub (column 9)
      profileData.undergraduateCollege !== undefined ? profileData.undergraduateCollege : (data[rowIndex][10] || ''), // Undergraduate College (column 10)
      profileData.undergraduateStream !== undefined ? profileData.undergraduateStream : (data[rowIndex][11] || ''), // Undergraduate Stream (column 11)
      profileData.graduationYear !== undefined ? profileData.graduationYear : (data[rowIndex][12] || ''), // Graduation Year (column 12)
      profileData.previousCompany !== undefined ? profileData.previousCompany : (data[rowIndex][13] || ''), // Previous Company (column 13)
      profileData.previousRole !== undefined ? profileData.previousRole : (data[rowIndex][14] || ''), // Previous Role (column 14)
      profileData.previousDuration !== undefined ? profileData.previousDuration : (data[rowIndex][15] || ''), // Previous Duration (column 15)
      profileData.techSkills !== undefined ? profileData.techSkills : (data[rowIndex][16] || ''), // Tech Skills (column 16)
      profileData.softSkills !== undefined ? profileData.softSkills : (data[rowIndex][17] || ''), // Soft Skills (column 17)
      profileData.achievements !== undefined ? profileData.achievements : (data[rowIndex][18] || ''), // Achievements (column 18)
      profileData.certifications !== undefined ? profileData.certifications : (data[rowIndex][19] || ''), // Certifications (column 19)
      profileData.interests !== undefined ? profileData.interests : (data[rowIndex][20] || ''), // Interests (column 20)
      profileData.languages !== undefined ? profileData.languages : (data[rowIndex][21] || ''), // Languages (column 21)
      profileData.profilePicture !== undefined ? profileData.profilePicture : (data[rowIndex][22] || '') // Profile Picture (column 22)
    ];

    // Update the row (rowIndex + 1 because sheet rows are 1-based)
    const range = sheet.getRange(rowIndex + 1, 1, 1, updatedRow.length);
    range.setValues([updatedRow]);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        email: updatedRow[0],
        fullName: updatedRow[1],
        rollNo: updatedRow[2],
        batch: updatedRow[3],
        aboutMe: updatedRow[4],
        phoneNo: updatedRow[5],
        currentLocation: updatedRow[6],
        linkedIn: updatedRow[7],
        portfolioLink: updatedRow[8],
        github: updatedRow[9],
        undergraduateCollege: updatedRow[10],
        undergraduateStream: updatedRow[11],
        graduationYear: updatedRow[12],
        previousCompany: updatedRow[13],
        previousRole: updatedRow[14],
        previousDuration: updatedRow[15],
        techSkills: updatedRow[16],
        softSkills: updatedRow[17],
        achievements: updatedRow[18],
        certifications: updatedRow[19],
        interests: updatedRow[20],
        languages: updatedRow[21],
        profilePicture: updatedRow[22]
      }
    };

  } catch (error) {
    Logger.log('Error in updateStudentProfile: ' + error.message);
    return {
      success: false,
      error: 'Failed to update student profile: ' + error.message
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

/**
 * Upload image to ImgBB (free image hosting service)
 * @param {string} imageData - Base64 encoded image data
 * @param {string} fileName - Original file name
 * @return {Object} ImgBB upload result
 */
function uploadToImgBB(imageData, fileName) {
  try {
    Logger.log('Uploading to ImgBB: ' + fileName);
    
    // Prepare form data for ImgBB API
    const payload = {
      'key': IMGBB_API_KEY,
      'image': imageData,
      'name': fileName.replace(/\.[^/.]+$/, ""), // Remove extension
      'expiration': '' // No expiration (permanent)
    };
    
    const options = {
      'method': 'POST',
      'payload': payload
    };
    
    const response = UrlFetchApp.fetch(IMGBB_UPLOAD_URL, options);
    const responseText = response.getContentText();
    const result = JSON.parse(responseText);
    
    if (result.success) {
      Logger.log('ImgBB upload successful: ' + result.data.url);
      return {
        success: true,
        data: {
          url: result.data.url,
          display_url: result.data.display_url,
          thumb: {
            url: result.data.thumb.url
          },
          medium: {
            url: result.data.medium.url
          },
          delete_url: result.data.delete_url
        }
      };
    } else {
      Logger.log('ImgBB upload failed: ' + responseText);
      return {
        success: false,
        error: result.error ? result.error.message : 'Upload failed'
      };
    }
    
  } catch (error) {
    Logger.log('Error uploading to ImgBB: ' + error.message);
    return {
      success: false,
      error: 'ImgBB upload error: ' + error.message
    };
  }
}

/**
 * Upload profile picture to both Google Drive (backup) and ImgBB (public display)
 * @param {string} studentEmail - Student's email
 * @param {string} imageData - Base64 encoded image data
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type of the image
 * @return {Object} Upload result with public URL
 */
/**
 * Get dashboard links for student - specifically from DASHBOARDS category
 * @param {string} studentEmail Student email
 * @return {Object} Dashboard links data
 */
function getDashboardLinks(studentEmail) {
  try {
    Logger.log(`Getting dashboard links for: ${studentEmail}`);
    
    // Get student profile for batch info
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      Logger.log(`Student profile not found for: ${studentEmail}`);
      return {
        success: false,
        error: 'Student profile not found'
      };
    }
    
    const student = studentProfile.data;
    Logger.log(`Student found - Batch: ${student.batch}, Name: ${student.fullName}`);
    
    // Get dashboard data from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet - need at least headers and one data row');
      return {
        success: true,
        data: []
      };
    }
    
    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    Logger.log(`Headers found: ${headers.length} columns`);
    Logger.log(`Column indices mapped: ${Object.keys(indices).length} fields`);
    
    const dashboards = [];
    
    Logger.log(`Processing ${data.length - 2} data rows for dashboard entries`);
    
    // Process each row looking for DASHBOARDS category entries (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Check if this is a DASHBOARDS category entry
      const category = getValue(row, indices.category);
      Logger.log(`Row ${i}: Category = "${category}"`);
      if (category !== 'DASHBOARDS') continue;
      
      Logger.log(`Found DASHBOARDS row ${i}`);
      
      // Check if published
      const publish = getValue(row, indices.publish);
      Logger.log(`Row ${i}: Publish = "${publish}"`);
      if (publish !== 'Yes') continue;
      
      Logger.log(`Row ${i}: Passed publish check`);
      
      // Get dashboard-specific data
      const dashboardName = getValue(row, indices.dashboardName) || getValue(row, indices.title);
      const dashboardLink = getValue(row, indices.dashboardLink) || getValue(row, indices.driveLink) || getValue(row, indices.sheetsLink);
      const dashboardDescription = getValue(row, indices.dashboardDescription) || getValue(row, indices.content);
      const dashboardVisibility = getValue(row, indices.dashboardVisibility);
      const dashboardSop = getValue(row, indices.dashboardSop);
      
      // Skip if no name or link
      if (!dashboardName || !dashboardLink) continue;
      
      // Check visibility settings
      if (dashboardVisibility && dashboardVisibility.toLowerCase() === 'hidden') continue;
      
      // Check if student has access to this dashboard
      const targetBatch = getValue(row, indices.targetBatch);
      const targetStudents = getValue(row, indices.targetStudents);
      
      Logger.log(`Row ${i}: Target Batch = "${targetBatch}", Student Batch = "${student.batch}"`);
      Logger.log(`Row ${i}: Target Students = "${targetStudents}"`);
      
      if (isContentTargetedToStudent(targetBatch, targetStudents, student)) {
        Logger.log(`Row ${i}: Passed targeting check`);
        // Calculate current status for dashboard availability
        const startDateTime = parseDateTime(getValue(row, indices.startDateTime));
        const endDateTime = parseDateTime(getValue(row, indices.endDateTime));
        const currentStatus = calculateContentStatus(startDateTime, endDateTime);
        
        // Only include active or upcoming dashboards
        if (currentStatus === 'Active' || currentStatus === 'Upcoming') {
          dashboards.push({
            name: dashboardName,
            link: dashboardLink,
            description: dashboardDescription || '',
            type: getDashboardType(dashboardName),
            category: category,
            eventType: getValue(row, indices.eventType) || 'dashboard',
            visibility: dashboardVisibility || 'public',
            sop: dashboardSop || '',
            status: currentStatus,
            priority: getValue(row, indices.priority) || 'Medium'
          });
        }
      }
    }
    
    // Sort dashboards by priority (High -> Medium -> Low) and then by name
    dashboards.sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
    
    Logger.log(`Found ${dashboards.length} dashboard links for ${studentEmail}`);
    
    return {
      success: true,
      data: dashboards
    };
    
  } catch (error) {
    Logger.log('Error in getDashboardLinks: ' + error.message);
    return {
      success: false,
      error: 'Failed to get dashboard links: ' + error.message
    };
  }
}

/**
 * Get student schedule/calendar data - specifically from CLASS/SESSION SCHEDULE category
 * @param {string} studentEmail Student email
 * @param {string} startDate Optional start date filter (YYYY-MM-DD)
 * @param {string} endDate Optional end date filter (YYYY-MM-DD)
 * @return {Object} Schedule data
 */
function getStudentSchedule(studentEmail, startDate, endDate) {
  try {
    Logger.log(`Getting schedule for: ${studentEmail}`);
    
    // Get student profile for batch info
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      Logger.log(`Student profile not found for: ${studentEmail}`);
      return {
        success: false,
        error: 'Student profile not found'
      };
    }
    
    const student = studentProfile.data;
    Logger.log(`Student found - Batch: ${student.batch}, Name: ${student.fullName}`);
    
    // Get schedule data from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet - need at least headers and one data row');
      return {
        success: true,
        data: []
      };
    }
    
    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    Logger.log(`Headers found: ${headers.length} columns`);
    Logger.log(`Column indices mapped: ${Object.keys(indices).length} fields`);
    
    const scheduleItems = [];
    const now = new Date();
    
    // Parse date filters if provided
    const filterStartDate = startDate ? new Date(startDate) : null;
    const filterEndDate = endDate ? new Date(endDate) : null;
    
    Logger.log(`Processing ${data.length - 2} data rows for schedule entries`);
    
    // Process each row looking for entries with dates (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Get category and check if it has meaningful dates
      const category = getValue(row, indices.category);
      Logger.log(`Row ${i}: Category = "${category}"`);
      
      // Skip entries without valid categories
      if (!category) continue;
      
      // Skip categories that don't belong in calendar view
      const nonCalendarCategories = ['DASHBOARDS', 'POLICY & DOCUMENTS'];
      if (nonCalendarCategories.includes(category)) {
        Logger.log(`Row ${i}: Skipping non-calendar category: ${category}`);
        continue;
      }
      
      // Get start and end date times to check if this entry should appear in calendar
      const startDateTimeValue = getValue(row, indices.startDateTime);
      const endDateTimeValue = getValue(row, indices.endDateTime);
      
      // Skip entries without dates (no point showing them in calendar)
      if (!startDateTimeValue && !endDateTimeValue) {
        Logger.log(`Row ${i}: Skipping - no dates provided`);
        continue;
      }
      
      Logger.log(`Found calendar entry: ${category} row ${i}`);
      
      // Check if published
      const publish = getValue(row, indices.publish);
      Logger.log(`Row ${i}: Publish = "${publish}"`);
      if (publish !== 'Yes') continue;
      
      Logger.log(`Row ${i}: Passed publish check`);
      
      // Check if student has access to this schedule item
      const targetBatch = getValue(row, indices.targetBatch);
      const targetStudents = getValue(row, indices.targetStudents);
      
      Logger.log(`Row ${i}: Target Batch = "${targetBatch}", Student Batch = "${student.batch}"`);
      
      if (isContentTargetedToStudent(targetBatch, targetStudents, student)) {
        Logger.log(`Row ${i}: Passed targeting check`);
        
        // Get schedule timing
        const startDateTime = parseDateTime(startDateTimeValue);
        const endDateTime = parseDateTime(endDateTimeValue);
        
        // Apply date filters if provided
        if (filterStartDate && startDateTime && startDateTime < filterStartDate) continue;
        if (filterEndDate && startDateTime && startDateTime > filterEndDate) continue;
        
        // Calculate current status for schedule item
        const currentStatus = calculateContentStatus(startDateTime, endDateTime);
        
        // Map categories to display categories and determine eventType
        let displayCategory = category;
        let defaultEventType = 'general';
        
        switch (category) {
          case 'CLASS/SESSION SCHEDULE': 
            defaultEventType = 'class'; 
            break;
          case 'ASSIGNMENTS & TASKS': 
            defaultEventType = 'assignment'; 
            break;
          case 'EVENTS': 
            displayCategory = 'Events & Announcements';
            defaultEventType = 'event'; 
            break;
          case 'ANNOUNCEMENTS': 
            displayCategory = 'Events & Announcements';
            defaultEventType = 'announcement'; 
            break;
          case 'FORMS': 
            defaultEventType = 'form'; 
            break;
          case 'COURSE MATERIAL': 
            displayCategory = 'Resource';
            defaultEventType = 'resource'; 
            break;
          default: 
            defaultEventType = 'general'; 
            break;
        }
        
        // Determine title with category-specific fallbacks
        let itemTitle = getValue(row, indices.title);
        if (!itemTitle) {
          switch (category) {
            case 'EVENTS':
              itemTitle = getValue(row, indices.eventTitle);
              break;
            default:
              itemTitle = 'Untitled';
              break;
          }
        }
        // Final fallback
        if (!itemTitle) itemTitle = 'Untitled';

        // Create schedule item
        const scheduleItem = {
          id: getValue(row, indices.id),
          category: displayCategory,
          originalCategory: category, // Keep original for category-specific fields
          eventType: getValue(row, indices.eventType) || defaultEventType,
          title: itemTitle,
          subTitle: getValue(row, indices.subTitle),
          content: getValue(row, indices.content),
          domain: getValue(row, indices.domain),
          subject: getValue(row, indices.subject),
          groups: getValue(row, indices.groups),
          postedBy: getValue(row, indices.postedBy),
          startDateTime: startDateTime ? startDateTime.toISOString() : null,
          endDateTime: endDateTime ? endDateTime.toISOString() : null,
          startDateTimeRaw: startDateTime, // Keep raw date for sorting
          endDateTimeRaw: endDateTime,
          targetBatch: getValue(row, indices.targetBatch),
          term: getValue(row, indices.term),
          priority: getValue(row, indices.priority) || 'Medium',
          status: currentStatus,
          driveLink: getValue(row, indices.driveLink),
          sheetsLink: getValue(row, indices.sheetsLink),
          requiresAcknowledgment: getValue(row, indices.requireAcknowledgment) === 'Yes',
          createdAt: parseDateTime(getValue(row, indices.createdAt))?.toISOString() || null
        };
        
        // Add category-specific fields for better calendar display
        switch (scheduleItem.originalCategory) {
          case 'ASSIGNMENTS & TASKS':
            scheduleItem.instructions = getValue(row, indices.instructions);
            scheduleItem.maxPoints = getValue(row, indices.maxPoints);
            scheduleItem.submissionGuidelines = getValue(row, indices.submissionGuidelines);
            scheduleItem.groupSize = getValue(row, indices.groupSize);
            break;
            
          case 'EVENTS':
            scheduleItem.eventTitle = getValue(row, indices.eventTitle);
            scheduleItem.eventLocation = getValue(row, indices.eventLocation);
            scheduleItem.eventAgenda = getValue(row, indices.eventAgenda);
            scheduleItem.speakerInfo = getValue(row, indices.speakerInfo);
            break;
            
          case 'ANNOUNCEMENTS':
            scheduleItem.messageDetails = getValue(row, indices.messageDetails);
            scheduleItem.callToAction = getValue(row, indices.callToAction);
            break;
            
          case 'FORMS':
            scheduleItem.formDescription = getValue(row, indices.formDescription);
            scheduleItem.formLink = getValue(row, indices.formLink);
            break;
            
          case 'COURSE MATERIAL':
            scheduleItem.learningObjectives = getValue(row, indices.learningObjectives);
            scheduleItem.prerequisites = getValue(row, indices.prerequisites);
            break;
        }
        
        scheduleItems.push(scheduleItem);
        Logger.log(`Row ${i}: Added schedule item - ${scheduleItem.title}`);
      } else {
        Logger.log(`Row ${i}: Failed targeting check`);
      }
    }
    
    // Sort schedule items by start date/time (upcoming first)
    scheduleItems.sort((a, b) => {
      if (!a.startDateTimeRaw) return 1;
      if (!b.startDateTimeRaw) return -1;
      return a.startDateTimeRaw - b.startDateTimeRaw;
    });
    
    Logger.log(`Found ${scheduleItems.length} schedule items for ${studentEmail}`);
    
    return {
      success: true,
      data: scheduleItems
    };
    
  } catch (error) {
    Logger.log('Error in getStudentSchedule: ' + error.message);
    return {
      success: false,
      error: 'Failed to get student schedule: ' + error.message
    };
  }
}

/**
 * Get policies and documents for student
 * @param {string} studentEmail Student email
 * @return {Object} Policies and documents data
 */
function getPoliciesAndDocuments(studentEmail) {
  try {
    Logger.log(`Getting policies and documents for: ${studentEmail}`);
    
    // Get student profile for batch info
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      Logger.log(`Student profile not found for: ${studentEmail}`);
      return {
        success: false,
        error: 'Student profile not found'
      };
    }
    
    const student = studentProfile.data;
    Logger.log(`Student found - Batch: ${student.batch}, Name: ${student.fullName}`);
    
    // Get data from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet - need at least headers and one data row');
      return {
        success: true,
        data: []
      };
    }
    
    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    Logger.log(`Headers found: ${headers.length} columns`);
    Logger.log(`Column indices mapped: ${Object.keys(indices).length} fields`);
    
    const policyItems = [];
    const now = new Date();
    
    Logger.log(`Processing ${data.length - 2} data rows for POLICY & DOCUMENTS entries`);
    
    // Process each row looking for POLICY & DOCUMENTS entries (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Get category and check if it's POLICY & DOCUMENTS
      const category = getValue(row, indices.category);
      Logger.log(`Row ${i}: Category = "${category}"`);
      
      // Only process POLICY & DOCUMENTS entries
      if (category !== 'POLICY & DOCUMENTS') continue;
      
      Logger.log(`Found policy/document entry at row ${i}`);
      
      // Check if published
      const publish = getValue(row, indices.publish);
      Logger.log(`Row ${i}: Publish = "${publish}"`);
      if (publish !== 'Yes') continue;
      
      Logger.log(`Row ${i}: Passed publish check`);
      
      // Check if student has access to this policy/document
      const targetBatch = getValue(row, indices.targetBatch);
      const targetStudents = getValue(row, indices.targetStudents);
      
      Logger.log(`Row ${i}: Target Batch = "${targetBatch}", Student Batch = "${student.batch}"`);
      
      if (isContentTargetedToStudent(targetBatch, targetStudents, student)) {
        Logger.log(`Row ${i}: Passed targeting check`);
        
        // Get dates for status calculation
        const startDateTime = parseDateTime(getValue(row, indices.startDateTime));
        const endDateTime = parseDateTime(getValue(row, indices.endDateTime));
        
        // Calculate status based on dates (if provided)
        let currentStatus = 'Active';
        if (startDateTime && endDateTime) {
          if (now < startDateTime) {
            currentStatus = 'Upcoming';
          } else if (now > endDateTime) {
            currentStatus = 'Expired';
          } else {
            currentStatus = 'Active';
          }
        } else if (startDateTime && now < startDateTime) {
          currentStatus = 'Upcoming';
        } else if (endDateTime && now > endDateTime) {
          currentStatus = 'Expired';
        }
        
        // Get title
        let itemTitle = getValue(row, indices.title);
        if (!itemTitle) {
          // Try policy name as fallback
          itemTitle = getValue(row, indices.policyName);
        }
        // Final fallback
        if (!itemTitle) itemTitle = 'Untitled Policy/Document';

        // Create policy/document item
        const policyItem = {
          id: getValue(row, indices.id),
          category: category,
          eventType: getValue(row, indices.eventType) || 'Policy',
          title: itemTitle,
          subTitle: getValue(row, indices.subTitle),
          content: getValue(row, indices.content),
          postedBy: getValue(row, indices.postedBy),
          startDateTime: startDateTime ? startDateTime.toISOString() : null,
          endDateTime: endDateTime ? endDateTime.toISOString() : null,
          targetBatch: getValue(row, indices.targetBatch),
          priority: getValue(row, indices.priority) || 'Medium',
          status: currentStatus,
          driveLink: getValue(row, indices.driveLink),
          sheetsLink: getValue(row, indices.sheetsLink),
          fileuploadLink: getValue(row, indices.fileuploadLink),
          requiresAcknowledgment: getValue(row, indices.requiresAcknowledgment) === 'Yes',
          createdAt: parseDateTime(getValue(row, indices.createdAt))?.toISOString() || null,
          editedAt: parseDateTime(getValue(row, indices.editedAt))?.toISOString() || null,
          editedBy: getValue(row, indices.editedBy),
          
          // POLICY & DOCUMENTS specific fields
          policyType: getValue(row, indices.policyType),
          policyName: getValue(row, indices.policyName),
          policyContent: getValue(row, indices.policyContent)
        };
        
        // Check for files
        const driveLink = getValue(row, indices.driveLink);
        const sheetsLink = getValue(row, indices.sheetsLink);
        const fileuploadLink = getValue(row, indices.fileuploadLink);
        policyItem.hasFiles = !!(driveLink || sheetsLink || fileuploadLink);
        
        policyItems.push(policyItem);
        Logger.log(`Row ${i}: Added policy/document item - ${policyItem.title}`);
      } else {
        Logger.log(`Row ${i}: Failed targeting check`);
      }
    }
    
    // Sort policy items by title
    policyItems.sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    Logger.log(`Found ${policyItems.length} policy/document items for ${studentEmail}`);
    
    return {
      success: true,
      data: policyItems
    };
    
  } catch (error) {
    Logger.log('Error in getPoliciesAndDocuments: ' + error.message);
    return {
      success: false,
      error: 'Failed to get policies and documents: ' + error.message
    };
  }
}

/**
 * Get course resources with dynamic hierarchical folder structure
 * @param {string} studentEmail - Student's email address
 * @returns {Object} Dynamic folder structure with resources organized by term/domain/subject
 */
function getCourseResources(studentEmail) {
  try {
    Logger.log(`Getting course resources for: ${studentEmail}`);
    
    // Get student profile for batch info
    const studentProfile = getStudentProfile(studentEmail);
    if (!studentProfile.success) {
      Logger.log(`Student profile not found for: ${studentEmail}`);
      return {
        success: false,
        error: 'Student profile not found'
      };
    }
    
    const student = studentProfile.data;
    Logger.log(`Student found - Batch: ${student.batch}, Name: ${student.fullName}`);
    
    // Get data from main sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(MAIN_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 2) {
      Logger.log('Not enough data in sheet - need at least headers and one data row');
      return {
        success: true,
        data: {
          availableTerms: [],
          folderStructure: {},
          flatMaterials: []
        }
      };
    }
    
    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    Logger.log(`Headers found: ${headers.length} columns`);
    Logger.log(`Column indices mapped: ${Object.keys(indices).length} fields`);
    
    const courseMaterials = [];
    const now = new Date();
    
    Logger.log(`Processing ${data.length - 2} data rows for COURSE MATERIAL entries`);
    
    // Process each row looking for COURSE MATERIAL entries (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      
      // Get category and check if it's COURSE MATERIAL
      const category = getValue(row, indices.category);
      
      // Only process COURSE MATERIAL entries
      if (category === 'COURSE MATERIAL') {
        // Get basic info
        const publish = getValue(row, indices.publish);
        
        Logger.log(`Row ${i}: Found COURSE MATERIAL - Publish: ${publish}`);
        
        // Skip non-published items (case sensitive: "Yes" not "YES")
        if (publish !== 'Yes') {
          Logger.log(`Skipping row ${i}: Not published (${publish})`);
          continue;
        }
        
        // Check if student is targeted (simplified logic)
        const targetBatch = getValue(row, indices.targetBatch);
        
        // Direct batch comparison instead of complex getTargetedStudents logic
        if (targetBatch && targetBatch !== 'ALL' && targetBatch !== student.batch) {
          Logger.log(`Skipping row ${i}: Student batch ${student.batch} not targeted (target: ${targetBatch})`);
          continue;
        }
        
        // Create course material item
        const materialItem = {
          id: getValue(row, indices.id),
          title: getValue(row, indices.title),
          subTitle: getValue(row, indices.subTitle),
          term: getValue(row, indices.term) || null,
          domain: getValue(row, indices.domain) || null,
          subject: getValue(row, indices.subject) || null,
          priority: parseInt(getValue(row, indices.priority)) || 0,
          createdAt: parseDateTime(getValue(row, indices.createdAt))?.toISOString() || null,
          editedAt: parseDateTime(getValue(row, indices.editedAt))?.toISOString() || null,
          driveLink: getValue(row, indices.driveLink),
          fileURL: getValue(row, indices.fileURL), // S.File URL field
          attachments: getValue(row, indices.fileURL) || getValue(row, indices.driveLink), // Use S.File URL first, then driveLink
          resourceLink: getValue(row, indices.fileURL) || getValue(row, indices.driveLink), // Use S.File URL first, then driveLink  
          learningObjectives: getValue(row, indices.learningObjectives),
          prerequisites: getValue(row, indices.prerequisites),
          eventType: getValue(row, indices.eventType),
          category: getValue(row, indices.category),
          targetBatch: getValue(row, indices.targetBatch)
        };
        
        courseMaterials.push(materialItem);
        Logger.log(`Added course material: ${materialItem.title} [Term: ${materialItem.term}, Domain: ${materialItem.domain}, Subject: ${materialItem.subject}]`);
      }
    }
    
    Logger.log(`Found ${courseMaterials.length} course materials for student`);
    
    // Now build dynamic hierarchical structure
    const availableTerms = [];
    const folderStructure = {};
    
    // First pass: discover all unique terms, domains, and subjects
    const termSet = new Set();
    const termDomainMap = new Map(); // term -> Set of domains
    const domainSubjectMap = new Map(); // "term|domain" -> Set of subjects
    
    courseMaterials.forEach(material => {
      const term = material.term || 'Other Resources';
      const domain = material.domain || 'General';
      const subject = material.subject || 'Miscellaneous';
      
      termSet.add(term);
      
      if (!termDomainMap.has(term)) {
        termDomainMap.set(term, new Set());
      }
      termDomainMap.get(term).add(domain);
      
      const termDomainKey = `${term}|${domain}`;
      if (!domainSubjectMap.has(termDomainKey)) {
        domainSubjectMap.set(termDomainKey, new Set());
      }
      domainSubjectMap.get(termDomainKey).add(subject);
    });
    
    // Sort terms logically (Term 1 before Term 10, alphabetical for text)
    const sortedTerms = Array.from(termSet).sort((a, b) => {
      // Handle "Other Resources" specially - put it last
      if (a === 'Other Resources') return 1;
      if (b === 'Other Resources') return -1;
      
      // Try to extract numbers for smart sorting
      const aMatch = a.match(/(\d+)/);
      const bMatch = b.match(/(\d+)/);
      
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        if (aNum !== bNum) return aNum - bNum;
      }
      
      // Fallback to alphabetical
      return a.localeCompare(b);
    });
    
    availableTerms.push(...sortedTerms);
    
    // Second pass: build hierarchical structure and organize materials
    sortedTerms.forEach(term => {
      folderStructure[term] = {
        domains: {}
      };
      
      const domains = Array.from(termDomainMap.get(term)).sort();
      
      domains.forEach(domain => {
        folderStructure[term].domains[domain] = {
          subjects: {}
        };
        
        const termDomainKey = `${term}|${domain}`;
        const subjects = Array.from(domainSubjectMap.get(termDomainKey)).sort();
        
        subjects.forEach(subject => {
          // Filter materials for this specific term/domain/subject combination
          const materialsForSubject = courseMaterials.filter(material => {
            const materialTerm = material.term || 'Other Resources';
            const materialDomain = material.domain || 'General';
            const materialSubject = material.subject || 'Miscellaneous';
            
            return materialTerm === term && 
                   materialDomain === domain && 
                   materialSubject === subject;
          });
          
          // Sort materials by priority (higher first), then by date
          materialsForSubject.sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return new Date(b.dateAdded) - new Date(a.dateAdded);
          });
          
          folderStructure[term].domains[domain].subjects[subject] = materialsForSubject;
        });
      });
    });
    
    Logger.log(`Built dynamic folder structure with ${availableTerms.length} terms`);
    
    return {
      success: true,
      data: {
        availableTerms: availableTerms,
        folderStructure: folderStructure,
        flatMaterials: courseMaterials.sort((a, b) => {
          // Sort flat materials by priority first, then by date
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        })
      }
    };
    
  } catch (error) {
    Logger.log('Error in getCourseResources: ' + error.message);
    return {
      success: false,
      error: 'Failed to get course resources: ' + error.message
    };
  }
}

/**
 * Determine dashboard type based on name
 * @param {string} name Dashboard name
 * @return {string} Dashboard type
 */
function getDashboardType(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('academic')) return 'academic';
  if (lowerName.includes('assignment')) return 'assignment';
  if (lowerName.includes('attendance')) return 'attendance';
  if (lowerName.includes('mentorship') || lowerName.includes('mentor')) return 'mentorship';
  if (lowerName.includes('placement')) return 'placement';
  return 'general';
}

function uploadProfilePicture(studentEmail, imageData, fileName, mimeType) {
  try {
    Logger.log(`Uploading profile picture for: ${studentEmail}`);
    
    // Validate inputs
    if (!studentEmail || !imageData || !fileName) {
      return {
        success: false,
        error: 'Missing required parameters for profile picture upload'
      };
    }

    // Get or create the main drive folder
    let mainFolder;
    try {
      mainFolder = DriveApp.getFolderById(MAIN_DRIVE_FOLDER_ID);
    } catch (error) {
      return {
        success: false,
        error: 'Main drive folder not found. Please check the MAIN_DRIVE_FOLDER_ID.'
      };
    }

    // Get or create the Profile subfolder
    let profileFolder;
    const profileFolders = mainFolder.getFoldersByName('Profile');
    if (profileFolders.hasNext()) {
      profileFolder = profileFolders.next();
    } else {
      profileFolder = mainFolder.createFolder('Profile');
      Logger.log('Created Profile subfolder in main drive folder');
    }

    // Get student's full name for folder creation
    const loginResult = getStudentProfile(studentEmail);
    if (!loginResult.success) {
      return {
        success: false,
        error: 'Student not found in database'
      };
    }
    
    const studentName = loginResult.data.fullName || studentEmail.split('@')[0];
    const sanitizedName = studentName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    // Get or create the student's personal folder
    let studentFolder;
    const studentFolders = profileFolder.getFoldersByName(sanitizedName);
    if (studentFolders.hasNext()) {
      studentFolder = studentFolders.next();
    } else {
      studentFolder = profileFolder.createFolder(sanitizedName);
      Logger.log('Created personal folder for student: ' + sanitizedName);
    }

    // Convert base64 to blob
    const imageBlob = Utilities.newBlob(
      Utilities.base64Decode(imageData), 
      mimeType, 
      `profile_picture_${Date.now()}.${getFileExtension(mimeType)}`
    );

    // Delete any existing profile picture for this student in their folder
    const existingFiles = studentFolder.getFiles();
    while (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      if (existingFile.getName().startsWith('profile_picture_')) {
        studentFolder.removeFile(existingFile);
        Logger.log('Deleted existing profile picture: ' + existingFile.getName());
      }
    }

    // Step 1: Upload to ImgBB for public display (primary)
    const imgbbResult = uploadToImgBB(imageData, fileName);
    
    let publicImageUrl = null;
    let imgbbUrls = {};
    
    if (imgbbResult.success) {
      publicImageUrl = imgbbResult.data.display_url;
      imgbbUrls = {
        full: imgbbResult.data.url,
        display: imgbbResult.data.display_url,
        thumb: imgbbResult.data.thumb.url,
        medium: imgbbResult.data.medium.url
      };
      Logger.log('ImgBB upload successful: ' + publicImageUrl);
    } else {
      Logger.log('ImgBB upload failed, will use Google Drive as fallback: ' + imgbbResult.error);
    }

    // Step 2: Upload to Google Drive for backup/storage
    const uploadedFile = studentFolder.createFile(imageBlob);
    
    // Set file sharing to viewable by anyone with the link
    uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get Google Drive URLs (fallback)
    const fileId = uploadedFile.getId();
    const driveUrls = {
      googleusercontent: `https://lh3.googleusercontent.com/d/${fileId}=w400-h400`,
      driveDirect: `https://drive.google.com/uc?export=view&id=${fileId}`,
      thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`,
      alternative: `https://lh3.googleusercontent.com/d/${fileId}`
    };
    
    // Use ImgBB URL as primary, Google Drive as fallback
    const finalImageUrl = publicImageUrl || driveUrls.googleusercontent;
    
    Logger.log('Profile picture uploaded successfully: ' + uploadedFile.getName());
    Logger.log('Google Drive File ID: ' + fileId);
    Logger.log('Final Image URL (primary): ' + finalImageUrl);
    Logger.log('ImgBB Success: ' + (imgbbResult.success ? 'Yes' : 'No'));

    // Update the student profile in the Student Profile sheet with the final URL
    const updateResult = updateStudentProfilePicture(studentEmail, finalImageUrl);
    if (!updateResult.success) {
      // File was uploaded but profile wasn't updated - log warning but don't fail
      Logger.log('Warning: Profile picture uploaded but sheet update failed: ' + updateResult.error);
    }

    return {
      success: true,
      data: {
        profilePictureUrl: finalImageUrl,
        imgbbUrls: imgbbUrls,
        driveUrls: driveUrls,
        driveFileId: fileId,
        uploadMethod: imgbbResult.success ? 'imgbb' : 'googledrive'
      },
      message: `Profile picture uploaded successfully via ${imgbbResult.success ? 'ImgBB' : 'Google Drive'}`
    };

  } catch (error) {
    Logger.log('Error in uploadProfilePicture: ' + error.message);
    return {
      success: false,
      error: 'Failed to upload profile picture: ' + error.message
    };
  }
}

/**
 * Update student profile picture URL in the Student Profile sheet
 * @param {string} studentEmail - Student's email
 * @param {string} profilePictureUrl - New profile picture URL
 * @return {Object} Update result
 */
function updateStudentProfilePicture(studentEmail, profilePictureUrl) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(STUDENT_PROFILE_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        error: 'No student profile data found'
      };
    }

    // Find the student in Student Profile sheet
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentEmail) {
        // Update profile picture column (column 23, index 22)
        sheet.getRange(i + 1, 23).setValue(profilePictureUrl);
        
        Logger.log('Updated profile picture URL for: ' + studentEmail);
        return {
          success: true,
          message: 'Profile picture URL updated in sheet'
        };
      }
    }

    // If student not found, try to add them from login data with the new profile picture
    const loginResult = getStudentProfile(studentEmail);
    if (loginResult.success) {
      const newRow = [
        studentEmail,
        loginResult.data.fullName || '',
        loginResult.data.rollNo || '',
        loginResult.data.batch || '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // Empty profile fields
        profilePictureUrl // Profile picture URL
      ];
      
      sheet.appendRow(newRow);
      Logger.log('Added new student profile with picture for: ' + studentEmail);
      
      return {
        success: true,
        message: 'New student profile created with profile picture'
      };
    }

    return {
      success: false,
      error: 'Student not found in login database'
    };

  } catch (error) {
    Logger.log('Error in updateStudentProfilePicture: ' + error.message);
    return {
      success: false,
      error: 'Failed to update profile picture in sheet: ' + error.message
    };
  }
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @return {string} File extension
 */
function getFileExtension(mimeType) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp'
  };
  
  return mimeToExt[mimeType] || 'jpg';
}

/**
 * Parse multipart form data from POST request
 * @param {string} contents - Raw POST data
 * @param {string} boundary - Boundary string
 * @return {Object} Parsed form data
 */
function parseMultipartFormData(contents, boundary) {
  const formData = {};
  
  try {
    const parts = contents.split('--' + boundary);
    
    for (const part of parts) {
      if (part.trim().length === 0 || part === '--') continue;
      
      const lines = part.split('\r\n');
      let fieldName = '';
      let fieldValue = '';
      let isBody = false;
      
      for (const line of lines) {
        if (line.includes('Content-Disposition: form-data;')) {
          const nameMatch = line.match(/name="([^"]+)"/);
          if (nameMatch) {
            fieldName = nameMatch[1];
          }
        } else if (line.trim() === '' && fieldName && !isBody) {
          isBody = true;
        } else if (isBody) {
          fieldValue += line;
        }
      }
      
      if (fieldName && fieldValue) {
        formData[fieldName] = fieldValue.trim();
      }
    }
  } catch (error) {
    Logger.log('Error parsing multipart form data: ' + error.message);
  }
  
  return formData;
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
    // If it's already a Date object, return it
    if (dateTimeValue instanceof Date) {
      return dateTimeValue;
    }
    
    // Convert to string for parsing
    const dateTimeString = String(dateTimeValue).trim();
    if (!dateTimeString) return null;
    
    // Check if it's in dd/mm/yyyy hh:mm:ss format (with flexible whitespace)
    const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = dateTimeString.match(ddmmyyyyRegex);
    
    // Also try dd/mm/yyyy hh:mm format (without seconds)
    if (!match) {
      const ddmmyyyyNoSecRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
      const matchNoSec = dateTimeString.match(ddmmyyyyNoSecRegex);
      
      if (matchNoSec) {
        const [, day, month, year, hour, minute] = matchNoSec;
        const parsedDate = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1, // Month is 0-indexed
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          0 // seconds = 0
        );
        
        Logger.log(`Parsed datetime (no seconds): ${dateTimeString} -> ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    }
    
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      // Create Date object (month is 0-indexed in JavaScript)
      const parsedDate = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1, // Month is 0-indexed
        parseInt(day, 10),
        parseInt(hour, 10),
        parseInt(minute, 10),
        parseInt(second, 10)
      );
      
      Logger.log(`Parsed datetime: ${dateTimeString} -> ${parsedDate.toISOString()}`);
      return parsedDate;
    }
    
    // If not in dd/mm/yyyy format, try standard Date parsing
    const standardDate = new Date(dateTimeString);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }
    
    Logger.log(`Could not parse datetime: ${dateTimeString}`);
    return null;
    
  } catch (error) {
    Logger.log("Error parsing datetime: " + error.message + " for value: " + dateTimeValue);
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
 * Check acknowledgment status for a content item
 * @param {string} contentId 
 * @param {string} studentEmail 
 * @return {Object} acknowledgment status object
 */
function getAcknowledgmentStatus(contentId, studentEmail) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ackSheet = ss.getSheetByName(ACKNOWLEDGEMENT_SHEET);
    
    if (!ackSheet) {
      Logger.log('Acknowledgement sheet not found');
      return { isAcknowledged: false, acknowledgmentTimestamp: null };
    }
    
    const ackData = ackSheet.getDataRange().getValues();
    const headers = ackData[0];
    
    // Find column indices
    const idIndex = headers.indexOf('S.ID');
    const emailIndex = headers.indexOf('Student Email');
    const timestampIndex = headers.indexOf('Timestamp');
    
    if (idIndex === -1 || emailIndex === -1) {
      Logger.log('Required columns not found in acknowledgement sheet');
      return { isAcknowledged: false, acknowledgmentTimestamp: null };
    }
    
    // Check if acknowledgment exists
    for (let i = 1; i < ackData.length; i++) {
      const row = ackData[i];
      if (row[idIndex] === contentId && row[emailIndex] === studentEmail) {
        return {
          isAcknowledged: true,
          acknowledgmentTimestamp: timestampIndex >= 0 ? row[timestampIndex] : null
        };
      }
    }
    
    return { isAcknowledged: false, acknowledgmentTimestamp: null };
  } catch (error) {
    Logger.log('Error checking acknowledgment status: ' + error.message);
    return { isAcknowledged: false, acknowledgmentTimestamp: null };
  }
}

/**
 * Get column indices mapping for new ALLINONE structure
 * @param {Array} headers Array of header names
 * @return {Object} Column indices mapping
 */
function getColumnIndices(headers) {
  const indices = {};
  const mapping = {
    // STATIC CORE (Common for all categories)
    "S.ID": "id",
    "S.Category": "category", 
    "S.Event Type": "eventType",
    "S.Publish": "publish",
    "S.Title": "title",
    "S.SubTitle": "subTitle",
    "S.Content": "content",
    "S.Posted By": "postedBy",
    "S.Created at": "createdAt",
    "S.Edited at": "editedAt",
    "S.Edited by": "editedBy",
    "S.StartDateTime": "startDateTime",
    "S.EndDateTime": "endDateTime", 
    "S.Status": "status",
    "S.Target Batch": "targetBatch",
    "S.TERM": "term",
    "S.Domain": "domain",
    "S.Subject": "subject",
    "S.Groups": "groups",
    "S.Students": "targetStudents",
    "S.Priority": "priority",
    "S.File URL": "fileURL",
    "S.Drive Link": "driveLink",
    "S.Fileupload Link": "fileuploadLink",
    "S.SheetsLink": "sheetsLink",
    "S.Acknowledge": "requireAcknowledgment",
    
    // CATEGORY-SPECIFIC COLUMNS
    
    // DASHBOARDS
    "D.Dashboard Name": "dashboardName",
    "D.Dashboard Link": "dashboardLink",
    "D.Description": "dashboardDescription",
    "D.Sop": "dashboardSop",
    "D.Visibility": "dashboardVisibility",
    
    // COURSE MATERIAL
    "C.Learning Objectives": "learningObjectives",
    "C.Prerequisites": "prerequisites",
    
    // ASSIGNMENTS & TASKS
    "AT.Instructions": "instructions",
    "AT.Max Points": "maxPoints",
    "AT.Submission Guidelines": "submissionGuidelines",
    "AT.Rubric Link": "rubricLink",
    "AT.Group Size": "groupSize",
    
    // ANNOUNCEMENTS
    "AN.Message Details": "messageDetails",
    "AN.Call to Action": "callToAction",
    "AN.Read Tracking": "readTracking",
    
    // POLICY & DOCUMENTS
    "PD.Type": "policyType",
    "PD.Policy Name": "policyName",
    "PD.Content": "policyContent",
    
    // EVENTS
    "E.Title": "eventTitle",
    "E.Location/Link": "eventLocation",
    "E.Agenda": "eventAgenda",
    "E.Speaker Info (if any)": "speakerInfo",
    
    // FORMS
    "F.Description": "formDescription",
    "F.Form Link": "formLink"
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
    
    return Utilities.formatDate(date, TIMEZONE, "dd/MM/yyyy HH:mm");
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
    
    if (data.length <= 2) {
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

    // Headers are in row 2 (index 1), data starts from row 3 (index 2)
    const headers = data[1];
    const indices = getColumnIndices(headers);
    
    const categories = new Set();
    const eventTypes = new Set();

    // Collect unique values from all content (start from row 3 = index 2)
    for (let i = 2; i < data.length; i++) {
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