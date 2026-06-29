export const SCHEMA_DEF = {
  identity: {
    type: 'object',
    label: 'Identity',
    fields: [
      { id: 'full_name', label: 'Full Name', required: true },
      { id: 'headline', label: 'Headline', required: false },
      { id: 'summary', label: 'Summary', required: false },
    ]
  },
  contact: {
    type: 'object',
    label: 'Contact Information',
    fields: [
      { id: 'email', label: 'Email', required: true },
      { id: 'phone', label: 'Phone', required: false },
      { id: 'location', label: 'Location', required: false },
      { id: 'linkedin', label: 'LinkedIn', required: false },
      { id: 'github', label: 'GitHub', required: false },
      { id: 'portfolio', label: 'Portfolio', required: false },
    ]
  },
  work_experience: {
    type: 'array',
    label: 'Work Experience',
    fields: [
      { id: 'company', label: 'Company', required: true },
      { id: 'title', label: 'Title', required: true },
      { id: 'location', label: 'Location', required: false },
      { id: 'start_date', label: 'Start Date', required: false },
      { id: 'end_date', label: 'End Date', required: false },
      { id: 'is_current', label: 'Is Current', required: false },
      { id: 'responsibilities', label: 'Responsibilities (Bullets)', required: false, isList: true }
    ]
  },
  education: {
    type: 'array',
    label: 'Education',
    fields: [
      { id: 'institution', label: 'Institution', required: true },
      { id: 'degree', label: 'Degree', required: false },
      { id: 'field_of_study', label: 'Field of Study', required: false },
      { id: 'graduation_year', label: 'Graduation Year', required: false },
      { id: 'gpa', label: 'GPA', required: false },
      { id: 'honors', label: 'Honors', required: false }
    ]
  },
  skills: {
    type: 'object',
    label: 'Skills',
    fields: [
      { id: 'technical', label: 'Technical Skills', required: false, isList: true },
      { id: 'soft', label: 'Soft Skills', required: false, isList: true },
      { id: 'languages', label: 'Languages', required: false, isList: true },
      { id: 'other', label: 'Other Skills', required: false, isList: true }
    ]
  },
  projects: {
    type: 'array',
    label: 'Projects',
    fields: [
      { id: 'name', label: 'Name', required: true },
      { id: 'description', label: 'Description', required: false },
      { id: 'technologies', label: 'Technologies', required: false, isList: true },
      { id: 'url', label: 'URL', required: false },
      { id: 'date', label: 'Date', required: false }
    ]
  },
  certifications: {
    type: 'array',
    label: 'Certifications',
    fields: [
      { id: 'name', label: 'Name', required: true },
      { id: 'issuer', label: 'Issuer', required: false },
      { id: 'date', label: 'Date', required: false },
      { id: 'credential_id', label: 'Credential ID', required: false },
      { id: 'url', label: 'URL', required: false }
    ]
  },
  awards: {
    type: 'array',
    label: 'Awards & Achievements',
    fields: [
      { id: 'title', label: 'Title', required: true },
      { id: 'issuer', label: 'Issuer', required: false },
      { id: 'date', label: 'Date', required: false },
      { id: 'description', label: 'Description', required: false }
    ]
  },
  publications: {
    type: 'array',
    label: 'Publications',
    fields: [
      { id: 'title', label: 'Title', required: true },
      { id: 'publisher', label: 'Publisher', required: false },
      { id: 'date', label: 'Date', required: false },
      { id: 'url', label: 'URL', required: false }
    ]
  },
  volunteer: {
    type: 'array',
    label: 'Volunteer Experience',
    fields: [
      { id: 'organisation', label: 'Organization', required: true },
      { id: 'role', label: 'Role', required: false },
      { id: 'start_date', label: 'Start Date', required: false },
      { id: 'end_date', label: 'End Date', required: false },
      { id: 'description', label: 'Description', required: false }
    ]
  }
};

/**
 * Returns a dictionary of template instances grouped by parent,
 * along with any validation warnings.
 *
 * Example Return:
 * {
 *   counts: { work_experience: 2, education: 1 },
 *   warnings: [{ type: 'missing_required', parent: 'work_experience', instanceId: 1, missing: ['title'] }],
 *   instances: {
 *     work_experience: {
 *       1: { boundFields: ['company'], objects: [ fabricObj ] },
 *       2: { boundFields: ['company', 'title'], objects: [...] }
 *     },
 *     identity: {
 *       0: { boundFields: ['full_name'], objects: [...] }
 *     }
 *   }
 * }
 */
export function analyzeCanvasBindings(canvas) {
  if (!canvas) return null;

  const instances = {};
  const counts = {};
  const warnings = [];

  const objects = canvas.getObjects();

  // 1. Group objects by parent and instance ID
  objects.forEach(obj => {
    const { bindParent, bindInstanceId = 0, bindField } = obj.customMeta || {};
    if (!bindParent || !bindField) return;

    if (!instances[bindParent]) {
      instances[bindParent] = {};
    }
    if (!instances[bindParent][bindInstanceId]) {
      instances[bindParent][bindInstanceId] = { boundFields: [], objects: [] };
    }

    if (!instances[bindParent][bindInstanceId].boundFields.includes(bindField)) {
      instances[bindParent][bindInstanceId].boundFields.push(bindField);
    }
    instances[bindParent][bindInstanceId].objects.push(obj);
  });

  // 2. Compute max counts for arrays and check required fields
  Object.keys(instances).forEach(parentKey => {
    const schemaDef = SCHEMA_DEF[parentKey];
    if (!schemaDef) return;

    if (schemaDef.type === 'array') {
      const instanceIds = Object.keys(instances[parentKey]).map(Number);
      counts[parentKey] = instanceIds.length > 0 ? Math.max(...instanceIds) : 0;
    }

    const requiredFields = schemaDef.fields.filter(f => f.required).map(f => f.id);

    // Check each instance
    Object.keys(instances[parentKey]).forEach(instId => {
      const boundFields = instances[parentKey][instId].boundFields;
      const missing = requiredFields.filter(f => !boundFields.includes(f));
      if (missing.length > 0) {
        warnings.push({
          parent: parentKey,
          instanceId: Number(instId),
          missing,
          label: schemaDef.label,
        });
      }
    });
  });

  return { instances, counts, warnings };
}
