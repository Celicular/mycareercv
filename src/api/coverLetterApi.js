import axiosClient from './axiosClient';

/**
 * Upload a resume PDF/DOCX specifically for cover letter generation.
 * Files go to uploads/{user_id}/coveruploads/
 * @param {File} file
 * @returns {Promise<{ filename: string, user_id: number, processing: boolean }>}
 */
export async function uploadResumeForCoverLetter(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosClient.post('/cover-letter/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Poll for cover-upload pipeline completion.
 * @param {number} userId
 * @param {string} filename
 * @returns {Promise<{ status: 'processing' | 'complete' }>}
 */
export async function getCoverUploadStatus(userId, filename) {
  const res = await axiosClient.get(`/cover-letter/status/${userId}/${filename}`);
  return res.data;
}

/**
 * Load the parsed resume JSON from a cover-upload file.
 * @param {number} userId
 * @param {string} filename  — stem without extension
 * @returns {Promise<object>}
 */
export async function loadCoverUploadResume(userId, filename) {
  const res = await axiosClient.get(`/cover-letter/load/${userId}/${filename}`);
  return res.data;
}

/**
 * Generate a cover letter using the 6-step AI pipeline.
 * @param {object} payload
 * @param {string} payload.document_name
 * @param {string} payload.job_description
 * @param {object} payload.preferences
 * @param {number|null} payload.source_resume_id  — provide an existing DB resume ID
 * @param {object|null} payload.resume_json        — pass JSON directly (from cover-upload)
 * @param {string|null} payload.resume_file_url    — relative path to uploaded file (optional)
 * @returns {Promise<object>}  Full generation result with cover_letter_json, quality_score, etc.
 */
export async function generateCoverLetter(payload) {
  const res = await axiosClient.post('/cover-letter/generate', payload);
  return res.data;
}

/**
 * List all cover letters for the authenticated user.
 * @returns {Promise<Array>}
 */
export async function listCoverLetters() {
  const res = await axiosClient.get('/cover-letter/');
  return res.data;
}

/**
 * Fetch a single cover letter with full details.
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function getCoverLetter(id) {
  const res = await axiosClient.get(`/cover-letter/${id}`);
  return res.data;
}

/**
 * Delete a cover letter by ID.
 * @param {number} id
 * @returns {Promise<{ message: string }>}
 */
export async function deleteCoverLetter(id) {
  const res = await axiosClient.delete(`/cover-letter/${id}`);
  return res.data;
}
