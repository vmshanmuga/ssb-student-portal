// ================================================================================================
// JOB PORTAL FUNCTIONS - SSB Placement Management
// ================================================================================================

/**
 * Generate unique Job ID
 * Format: SSB-YYYY-TYPE-####
 * Example: SSB-2025-INT-0001
 */
function generateJobID(type) {
  const year = new Date().getFullYear();
  const typeCode = type === 'Internship' ? 'INT' : type === 'Full-Time' ? 'FT' : 'CON';

  try {
    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    // Find highest number for this type and year
    let maxNum = 0;
    const prefix = `SSB-${year}-${typeCode}-`;

    for (let i = 1; i < data.length; i++) {
      const jobId = data[i][0];
      if (jobId && jobId.startsWith(prefix)) {
        const num = parseInt(jobId.split('-')[3]);
        if (num > maxNum) maxNum = num;
      }
    }

    const newNum = String(maxNum + 1).padStart(4, '0');
    return `${prefix}${newNum}`;

  } catch (error) {
    Logger.log(`Error generating Job ID: ${error.message}`);
    // Fallback to timestamp-based ID
    return `SSB-${year}-${typeCode}-${Date.now()}`;
  }
}

/**
 * Create Drive folder structure for a job posting
 * Structure: Main Folder / Batch / Company - Role - JobID / JobFileUploads, StudentResumes
 */
function createJobDriveFolders(batch, company, role, jobId) {
  try {
    const mainFolder = DriveApp.getFolderById(JOB_PORTAL_DRIVE_FOLDER_ID);

    // Create or get Batch folder
    const batchFolder = getOrCreateFolder(mainFolder, batch);

    // Create job-specific folder
    const jobFolderName = `${company} - ${role} - ${jobId}`;
    const jobFolder = getOrCreateFolder(batchFolder, jobFolderName);

    // Create subfolders
    const jobFilesFolder = getOrCreateFolder(jobFolder, 'JobFileUploads');
    const studentResumesFolder = getOrCreateFolder(jobFolder, 'StudentResumes');

    return {
      success: true,
      jobFolderId: jobFolder.getId(),
      jobFolderUrl: jobFolder.getUrl(),
      studentResumesFolderId: studentResumesFolder.getId(),
      studentResumesFolderUrl: studentResumesFolder.getUrl(),
      jobFilesFolderId: jobFilesFolder.getId()
    };

  } catch (error) {
    Logger.log(`Error creating job folders: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create response sheet for job applications
 * Columns: Timestamp, Email, Name, Batch, ResumeURL, Q1-Q30 answers, AssignmentFileURL, Status
 */
function createJobResponseSheet(jobId, company, role, questions) {
  try {
    const sheetName = `${jobId} - Applications`;
    const responseSheet = SpreadsheetApp.create(sheetName);
    const sheet = responseSheet.getActiveSheet();

    // Build headers
    const headers = [
      'Application_ID',
      'JobID',
      'Timestamp',
      'Student_Email',
      'Student_Name',
      'Student_Batch',
      'Student_Roll_No',
      'Resume_URL',
      'Assignment_File_URL'
    ];

    // Add question headers (Q1 to Q30)
    for (let i = 1; i <= 30; i++) {
      headers.push(`Q${i}_Answer`);
    }

    headers.push('Application_Status'); // Pending/Shortlisted/Rejected
    headers.push('Admin_Notes');
    headers.push('Submitted_At');

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Move to job folder
    const responseFile = DriveApp.getFileById(responseSheet.getId());
    const jobFolder = DriveApp.getFolderById(JOB_PORTAL_DRIVE_FOLDER_ID);
    responseFile.moveTo(jobFolder);

    return {
      success: true,
      sheetId: responseSheet.getId(),
      sheetUrl: responseSheet.getUrl()
    };

  } catch (error) {
    Logger.log(`Error creating response sheet: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new job posting
 */
function createJobPosting(jobData) {
  try {
    Logger.log('Creating new job posting...');

    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);

    // Generate Job ID
    const jobId = generateJobID(jobData.type);
    Logger.log(`Generated Job ID: ${jobId}`);

    // Create Drive folders
    const folderResult = createJobDriveFolders(
      jobData.batch,
      jobData.company,
      jobData.role,
      jobId
    );

    if (!folderResult.success) {
      return folderResult;
    }

    // Create response sheet
    const sheetResult = createJobResponseSheet(jobId, jobData.company, jobData.role, jobData.questions || []);

    if (!sheetResult.success) {
      return sheetResult;
    }

    // Prepare row data (178 columns total based on schema)
    const row = [
      jobId, // JobID
      jobData.batch || '',
      jobData.type || '',
      jobData.source || '',
      jobData.company || '',
      jobData.role || '',
      jobData.companyURL || '',
      jobData.location || '',
      jobData.workMode || '',
      jobData.eligibilityMonths || '',
      jobData.requiredSkills || '',
      jobData.roleTags || '',
      jobData.ctcType || '',
      jobData.ctcValue || '',
      jobData.ctcValueSecondary || '',
      jobData.ctcDisplay || '',
      jobData.esopType || 'None',
      jobData.esopValue || '',
      jobData.esopValueSecondary || '',
      jobData.esopDisplay || '',
      jobData.bonusType || 'None',
      jobData.bonusValue || '',
      jobData.bonusValueSecondary || '',
      jobData.bonusDisplay || '',
      jobData.compensationDisplay || '',
      jobData.jdHTML || '',
      jobData.applicationInstructions || '',
      jobData.adminURL1 || '',
      jobData.adminURL2 || '',
      jobData.adminURL3 || '',
      jobData.adminURL4 || '',
      jobData.adminURL5 || '',
      jobData.fileAttachmentName1 || '',
      jobData.fileAttachmentURL1 || '',
      jobData.fileAttachmentName2 || '',
      jobData.fileAttachmentURL2 || '',
      jobData.fileAttachmentName3 || '',
      jobData.fileAttachmentURL3 || '',
      jobData.applicationStartTime || '',
      jobData.applicationEndTime || '',
      folderResult.jobFolderUrl, // Drive Link
      folderResult.studentResumesFolderUrl, // StudentDriveLink
      sheetResult.sheetUrl // SheetsLink
    ];

    // Add 30 questions (Q1-Q30), each with Text, Type, Options, Required (4 fields × 30 = 120 fields)
    for (let i = 1; i <= 30; i++) {
      const q = jobData.questions?.find(q => q.number === i) || {};
      row.push(q.text || '');
      row.push(q.type || '');
      row.push(q.options || '');
      row.push(q.required || 'No');
    }

    // Add assignment fields
    row.push(jobData.hasAssignment || 'No');
    row.push(jobData.assignmentFileURL || '');
    row.push(jobData.assignmentDescription || '');
    row.push(jobData.assignmentDeadlineSameAsJob || 'Yes');
    row.push(jobData.assignmentDeadline || '');

    // Add eligibility rules
    row.push(jobData.showToBatchLevels || jobData.batch);
    row.push(jobData.showToNoOfferStudents || 'No');
    row.push(jobData.showToStudentsWithOneFT_PPO || 'No');
    row.push(jobData.showToStudentsWithNoPPO || 'No');
    row.push(jobData.showToStudentsWithInternships || 'No');
    row.push(jobData.showToStudentsWithZeroOffers || 'No');
    row.push(jobData.customVisibilityRule || '');

    // Add system columns
    row.push(folderResult.studentResumesFolderId); // ResumeFolderID
    row.push(sheetResult.sheetId); // ResponsesSheetID
    row.push(0); // ApplicationsCount
    row.push(jobData.status || 'Draft'); // Status
    row.push(jobData.createdBy || ''); // CreatedBy
    row.push(formatTimestampForSheets()); // CreatedAt
    row.push(''); // UpdatedBy
    row.push(''); // UpdatedAt

    // Append the row
    sheet.appendRow(row);

    Logger.log(`Job posting created successfully: ${jobId}`);

    return {
      success: true,
      jobId: jobId,
      message: 'Job posting created successfully',
      data: {
        jobId: jobId,
        driveUrl: folderResult.jobFolderUrl,
        responsesSheetUrl: sheetResult.sheetUrl
      }
    };

  } catch (error) {
    Logger.log(`Error creating job posting: ${error.message}`);
    Logger.log(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all job postings
 */
function getAllJobPostings(filters) {
  try {
    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }

    const headers = data[0];
    const jobs = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip if JobID is empty
      if (!row[0]) continue;

      const job = {
        jobId: row[0],
        batch: row[1],
        type: row[2],
        source: row[3],
        company: row[4],
        role: row[5],
        companyURL: row[6],
        location: row[7],
        workMode: row[8],
        eligibilityMonths: row[9],
        requiredSkills: row[10],
        roleTags: row[11],
        ctcType: row[12],
        ctcValue: row[13],
        ctcValueSecondary: row[14],
        ctcDisplay: row[15],
        esopType: row[16],
        esopValue: row[17],
        esopValueSecondary: row[18],
        esopDisplay: row[19],
        bonusType: row[20],
        bonusValue: row[21],
        bonusValueSecondary: row[22],
        bonusDisplay: row[23],
        compensationDisplay: row[24],
        jdHTML: row[25],
        applicationInstructions: row[26],
        applicationStartTime: row[38],
        applicationEndTime: row[39],
        driveLink: row[40],
        studentDriveLink: row[41],
        sheetsLink: row[42],
        status: row[168],
        applicationsCount: row[167],
        createdBy: row[169],
        createdAt: row[170],
        updatedBy: row[171],
        updatedAt: row[172]
      };

      // Apply filters if provided
      if (filters) {
        if (filters.batch && job.batch !== filters.batch) continue;
        if (filters.type && job.type !== filters.type) continue;
        if (filters.status && job.status !== filters.status) continue;
      }

      jobs.push(job);
    }

    return {
      success: true,
      data: jobs
    };

  } catch (error) {
    Logger.log(`Error getting job postings: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get single job posting by ID
 */
function getJobPosting(jobId) {
  try {
    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === jobId) {
        const row = data[i];

        // Parse questions
        const questions = [];
        for (let q = 1; q <= 30; q++) {
          const baseIndex = 42 + (q - 1) * 4; // Questions start at column 43 (index 42)
          const qText = row[baseIndex];
          if (qText) {
            questions.push({
              number: q,
              text: qText,
              type: row[baseIndex + 1],
              options: row[baseIndex + 2],
              required: row[baseIndex + 3]
            });
          }
        }

        return {
          success: true,
          data: {
            jobId: row[0],
            batch: row[1],
            type: row[2],
            source: row[3],
            company: row[4],
            role: row[5],
            companyURL: row[6],
            location: row[7],
            workMode: row[8],
            eligibilityMonths: row[9],
            requiredSkills: row[10],
            roleTags: row[11],
            ctcType: row[12],
            ctcValue: row[13],
            ctcValueSecondary: row[14],
            ctcDisplay: row[15],
            esopType: row[16],
            esopValue: row[17],
            esopValueSecondary: row[18],
            esopDisplay: row[19],
            bonusType: row[20],
            bonusValue: row[21],
            bonusValueSecondary: row[22],
            bonusDisplay: row[23],
            compensationDisplay: row[24],
            jdHTML: row[25],
            applicationInstructions: row[26],
            adminURL1: row[27],
            adminURL2: row[28],
            adminURL3: row[29],
            adminURL4: row[30],
            adminURL5: row[31],
            fileAttachmentName1: row[32],
            fileAttachmentURL1: row[33],
            fileAttachmentName2: row[34],
            fileAttachmentURL2: row[35],
            fileAttachmentName3: row[36],
            fileAttachmentURL3: row[37],
            applicationStartTime: row[38],
            applicationEndTime: row[39],
            driveLink: row[40],
            studentDriveLink: row[41],
            sheetsLink: row[42],
            questions: questions,
            hasAssignment: row[162],
            assignmentFileURL: row[163],
            assignmentDescription: row[164],
            assignmentDeadlineSameAsJob: row[165],
            assignmentDeadline: row[166],
            showToBatchLevels: row[157],
            showToNoOfferStudents: row[158],
            showToStudentsWithOneFT_PPO: row[159],
            showToStudentsWithNoPPO: row[160],
            showToStudentsWithInternships: row[161],
            showToStudentsWithZeroOffers: row[162],
            customVisibilityRule: row[163],
            resumeFolderId: row[164],
            responsesSheetId: row[165],
            applicationsCount: row[166],
            status: row[167],
            createdBy: row[168],
            createdAt: row[169],
            updatedBy: row[170],
            updatedAt: row[171]
          }
        };
      }
    }

    return {
      success: false,
      error: 'Job not found'
    };

  } catch (error) {
    Logger.log(`Error getting job posting: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update job posting
 */
function updateJobPosting(jobId, updates) {
  try {
    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === jobId) {
        // Update the row with new data
        // (Implementation similar to createJobPosting but updating existing row)

        // Update UpdatedBy and UpdatedAt
        const rowIndex = i + 1;
        sheet.getRange(rowIndex, 172).setValue(updates.updatedBy || '');
        sheet.getRange(rowIndex, 173).setValue(formatTimestampForSheets());

        return {
          success: true,
          message: 'Job posting updated successfully'
        };
      }
    }

    return {
      success: false,
      error: 'Job not found'
    };

  } catch (error) {
    Logger.log(`Error updating job posting: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete job posting
 */
function deleteJobPosting(jobId) {
  try {
    const sheet = SpreadsheetApp.openById(JOB_PORTAL_SHEET_ID).getSheetByName(JOB_PORTAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === jobId) {
        sheet.deleteRow(i + 1);

        return {
          success: true,
          message: 'Job posting deleted successfully'
        };
      }
    }

    return {
      success: false,
      error: 'Job not found'
    };

  } catch (error) {
    Logger.log(`Error deleting job posting: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
