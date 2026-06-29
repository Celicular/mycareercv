import axiosClient from './axiosClient';

/**
 * Fetch the parsed resume JSON for a given upload filename.
 * Used to pre-populate the builder form after pipeline completion.
 *
 * @param {number} userId
 * @param {string} filename - The upload filename (e.g. "upload-20260622223059-4dbdec71.pdf")
 * @returns {Promise<object>} Parsed resume data object
 */
export async function loadParsedResume(userId, filename) {
  const res = await axiosClient.get(`/resume/load/${userId}/${filename}`);
  return res.data;
}

/**
 * Save the final edited (or newly created) resume.
 * Sends the full resume object to the backend which validates, names, and persists it.
 *
 * @param {object} resumeData - Full resume object matching the RESUME_SCHEMA structure
 * @returns {Promise<{ filename: string, user_id: number, message: string }>}
 */
export async function saveResume(resumeData) {
  const res = await axiosClient.post('/resume/save', resumeData);
  return res.data;
}

/**
 * Upload a profile photo.
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string}>}
 */
export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosClient.post('/resume/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * List all saved resumes for the user.
 * @returns {Promise<Array>}
 */
export async function listResumes() {
  const res = await axiosClient.get('/resume/');
  return res.data;
}

/**
 * Send text to the ATS rewriter service to be optimized.
 * @param {string} text - The text to rewrite
 * @returns {Promise<{rewritten_text: string}>}
 */
export async function rewriteText(text) {
  const res = await axiosClient.post('/resume/rewrite', { text });
  return res.data;
}

/**
 * Check text for grammar and ATS issues.
 * @param {string} text - The text to check
 * @returns {Promise<{issues: Array}>}
 */
export async function grammarCheckText(text) {
  const res = await axiosClient.post('/resume/grammar-check', { text });
  return res.data;
}
