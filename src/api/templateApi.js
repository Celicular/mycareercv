import axiosClient from './axiosClient';

/**
 * Start the template ingestion pipeline by uploading an image or PDF.
 * @param {File} file - The image/PDF file to ingest.
 * @returns {Promise<{job_id: string, message: string}>}
 */
export async function ingestTemplate(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axiosClient.post('/templates/ingest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Poll the status of an ongoing ingestion job.
 * @param {string} jobId
 * @returns {Promise<{status: string, progress: number, current_stage: string, stage_label: string, error: string|null}>}
 */
export async function getIngestionStatus(jobId) {
  const res = await axiosClient.get(`/templates/ingestion/${jobId}/status`);
  return res.data;
}

/**
 * Retrieve the result of a completed ingestion job.
 * @param {string} jobId
 * @returns {Promise<{fabric_json: string, flagged_elements: string[], template_metadata: object}>}
 */
export async function getIngestionResult(jobId) {
  const res = await axiosClient.get(`/templates/ingestion/${jobId}/result`);
  return res.data;
}

/**
 * List all available templates (public and user's own).
 * @returns {Promise<Array>} Array of template objects.
 */
export async function listTemplates() {
  const res = await axiosClient.get('/templates/');
  return res.data;
}
