import { fabric } from 'fabric';
import { META_DEFAULTS } from './metaDefaults';

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────
const FONT    = 'Inter';
const DARK    = '#111111';
const MED     = '#444444';
const MUTED   = '#888888';
const GRAY    = '#555555';

const uid = () => Math.random().toString(36).slice(2, 9);

// ─────────────────────────────────────────────────────────────────────────────
// Safe Spawn Position helper (collision detection)
// ─────────────────────────────────────────────────────────────────────────────
export function getSafeSpawnPos(canvas) {
  let left = 40;
  let top = 100;
  
  if (canvas && typeof canvas.getVpCenter === 'function') {
    const center = canvas.getVpCenter();
    left = Math.max(40, center.x - 200);
    top = Math.max(40, center.y - 100);
  }

  if (!canvas) return { left, top };

  const objects = canvas.getObjects().filter(o => !o.excludeFromExport);
  const PADDING = 20;
  const ESTIMATED_WIDTH = 400;
  const ESTIMATED_HEIGHT = 100; 

  let collision = true;
  let currentTop = top;
  let iterations = 0;

  while (collision && iterations < 50) {
    collision = false;
    let maxBottom = currentTop;

    for (const obj of objects) {
      if (!obj.getBoundingRect) continue;
      const br = obj.getBoundingRect(); 
      // Check AABB overlap
      if (
        left < br.left + br.width &&
        left + ESTIMATED_WIDTH > br.left &&
        currentTop < br.top + br.height &&
        currentTop + ESTIMATED_HEIGHT > br.top
      ) {
        collision = true;
        if (br.top + br.height > maxBottom) {
          maxBottom = br.top + br.height;
        }
      }
    }

    if (collision) {
      currentTop = maxBottom + PADDING;
    }
    iterations++;
  }

  return { left, top: currentTop };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core textbox factory
// ─────────────────────────────────────────────────────────────────────────────
function makeText(text, {
  left = 40, top = 40, width = 200,
  fontSize = 12, fontWeight = '400',
  fill = DARK, lineHeight = 1.35,
  meta = {},
} = {}) {
  return new fabric.Textbox(text, {
    left, top, width,
    fontFamily: FONT,
    fontSize,
    fontWeight,
    fill,
    lineHeight,
    padding: 0,
    editable: true,
    customMeta: { ...META_DEFAULTS.text, ...meta },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitive factories  (single-object — unchanged API)
// ─────────────────────────────────────────────────────────────────────────────
export function createTextField(opts = {}) {
  return makeText(opts.text || 'Text', {
    left: opts.left, top: opts.top, width: opts.width || 200,
    fontSize: opts.fontSize || 14, fontWeight: opts.fontWeight,
    fill: opts.fill, lineHeight: opts.lineHeight,
    meta: { ...META_DEFAULTS.text, friendlyLabel: opts.label || 'Text', ...(opts.meta || {}) },
  });
}

export function createRichTextField(opts = {}) {
  return makeText(opts.text || 'Rich text block...', {
    left: opts.left, top: opts.top, width: opts.width || 300,
    fontSize: opts.fontSize || 11, fill: opts.fill || '#555555',
    lineHeight: 1.65,
    meta: { ...META_DEFAULTS.richText, ...(opts.meta || {}) },
  });
}

export function createBulletListField(opts = {}) {
  const items  = opts.items || ['Bullet point one', 'Bullet point two'];
  const isBadges = opts.meta && opts.meta.displayStyle === 'badges';
  
  const bullet = opts.bullet !== undefined ? opts.bullet : (isBadges ? '' : '•');
  const separator = isBadges ? ', ' : '\n';
  
  const text = items.map(b => bullet ? `${bullet}  ${b}` : b).join(separator);
  
  return makeText(text, {
    left: opts.left, top: opts.top, width: opts.width || 320,
    fontSize: opts.fontSize || 11, fill: opts.fill || MED,
    lineHeight: opts.lineHeight || 1.65,
    meta: { ...META_DEFAULTS.bulletList, friendlyLabel: opts.label || 'Bullet List', ...(opts.meta || {}) },
  });
}

export function createRect(opts = {}) {
  return new fabric.Rect({
    left: opts.left || 40, top: opts.top || 40,
    width: opts.width || 160, height: opts.height || 40,
    fill: opts.fill || GRAY, rx: opts.rx || 0, ry: opts.rx || 0,
    customMeta: { ...META_DEFAULTS.rect, ...(opts.meta || {}) },
  });
}

export function createCircle(opts = {}) {
  return new fabric.Circle({
    left: opts.left || 40, top: opts.top || 40,
    radius: opts.radius || 30, fill: opts.fill || GRAY,
    customMeta: { ...META_DEFAULTS.circle, ...(opts.meta || {}) },
  });
}

export function createLine(opts = {}) {
  return new fabric.Line([0, 0, opts.width || 200, 0], {
    left: opts.left || 40, top: opts.top || 40,
    stroke: opts.stroke || '#cccccc', strokeWidth: opts.strokeWidth || 1,
    customMeta: { ...META_DEFAULTS.line, ...(opts.meta || {}) },
  });
}

export function createDivider(opts = {}) {
  return new fabric.Line([0, 0, opts.width || 515, 0], {
    left: opts.left || 40, top: opts.top || 80,
    stroke: opts.stroke || '#e0e0e0', strokeWidth: 1,
    customMeta: { ...META_DEFAULTS.divider, ...(opts.meta || {}) },
  });
}

export function createImagePlaceholder(opts = {}) {
  const w = opts.width || 120, h = opts.height || 80;
  const bg = new fabric.Rect({ width: w, height: h, fill: '#f0f0f0', stroke: '#cccccc', strokeWidth: 1, strokeDashArray: [4, 4], rx: 4 });
  const lbl = new fabric.Text('IMAGE', { fontSize: 10, fill: '#aaaaaa', fontFamily: FONT, fontWeight: '600', originX: 'center', originY: 'center', left: w / 2, top: h / 2 });
  return new fabric.Group([bg, lbl], { left: opts.left || 40, top: opts.top || 40, customMeta: { ...META_DEFAULTS.imagePlaceholder, ...(opts.meta || {}) } });
}

export function createPhotoFrame(opts = {}) {
  const r = opts.radius || 40;
  const circ = new fabric.Circle({ radius: r, fill: '#e8e8e8', stroke: '#cccccc', strokeWidth: 2, originX: 'center', originY: 'center', left: r, top: r });
  const lbl  = new fabric.Text('PHOTO', { fontSize: 9, fill: '#aaaaaa', fontFamily: FONT, fontWeight: '700', originX: 'center', originY: 'center', left: r, top: r });
  return new fabric.Group([circ, lbl], { left: opts.left || 40, top: opts.top || 40, customMeta: { ...META_DEFAULTS.photoFrame, ...(opts.meta || {}) } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header helper (always flat — two separate objects)
// ─────────────────────────────────────────────────────────────────────────────
export function createSectionHeader(label, opts = {}) {
  const gid   = uid();
  const x     = opts.left || 40;
  const y     = opts.top  || 100;
  const color = opts.fill || GRAY;
  const W     = opts.width || 515;
  const sharedMeta = { sectionGroupId: gid, templateRole: 'decoration' };

  return [
    makeText(label.toUpperCase(), {
      left: x, top: y, width: W,
      fontSize: 9, fontWeight: '700', fill: color,
      meta: { ...sharedMeta, friendlyLabel: `${label} Header Text` },
    }),
    new fabric.Line([0, 0, W, 0], {
      left: x, top: y + 16,
      stroke: color, strokeWidth: 1.5, opacity: 0.35,
      customMeta: { ...META_DEFAULTS.divider, ...sharedMeta, friendlyLabel: `${label} Header Line` },
    }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Prebuilt section blueprints — return FLAT ARRAYS (no wrapping Group)
//   → Every element is individually selectable and text is directly editable.
//   → Elements share customMeta.sectionGroupId so the UI can link them.
// ─────────────────────────────────────────────────────────────────────────────

export function createNameHeaderBlock(opts = {}) {
  const gid = uid();
  const x   = opts.left || 40;
  const y   = opts.top  || 30;
  const sid = opts.sectionId || 'personal-info';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Personal Info',
    sectionOrder: opts.sectionOrder || 1,
    isOptional: true,
    aiContent: false,
    bindParent: 'identity',
  };

  return [
    makeText('Full Name', {
      left: x, top: y, width: 400,
      fontSize: 26, fontWeight: '800', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Full Name', elementLabel: 'Full Name', bindField: 'full_name' },
    }),
    makeText('Professional Headline', {
      left: x, top: y + 36, width: 400,
      fontSize: 11, fontWeight: '400', fill: '#777777',
      meta: { ...sm, friendlyLabel: 'Headline', elementLabel: 'Headline', bindField: 'headline' },
    }),
  ];
}

export function createContactBar(opts = {}) {
  const gid = uid();
  const x   = opts.left || 40;
  const y   = opts.top  || 82;
  const sid = opts.sectionId || 'contact-info';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Contact Info',
    sectionOrder: opts.sectionOrder || 2,
    isOptional: true,
    aiContent: false,
    bindParent: 'identity',
  };
  const fs  = 10;

  return [
    makeText('email@example.com', {
      left: x,       top: y, width: 160, fontSize: fs, fill: MED,
      meta: { ...sm, friendlyLabel: 'Email', elementLabel: 'Email', bindField: 'contact.email' },
    }),
    makeText('+91 00000 00000', {
      left: x + 168, top: y, width: 130, fontSize: fs, fill: MED,
      meta: { ...sm, friendlyLabel: 'Phone', elementLabel: 'Phone', bindField: 'contact.phone' },
    }),
    makeText('City, Country', {
      left: x + 306, top: y, width: 120, fontSize: fs, fill: MED,
      meta: { ...sm, friendlyLabel: 'Location', elementLabel: 'Location', bindField: 'contact.location' },
    }),
  ];
}

export function createWorkExperienceSection(opts = {}, layout = 'full-list') {
  const gid = uid();
  const x   = opts.left || 40;
  let   y   = opts.top  || 120;
  const sid = opts.sectionId || 'work-experience';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Work Experience',
    sectionOrder: opts.sectionOrder || 3,
    isOptional: true,
    aiContent: false,
    bindParent: 'work_experience',
  };

  const elements = [];
  
  if (layout === 'half-split') {
    // Narrow left column for Date/Location, Wide right for Title/Company/Desc
    elements.push(makeText('MM/YYYY – Present', {
      left: x, top: y, width: 140, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Dates', elementLabel: 'Date Range', bindField: 'start_date' },
    }));
    elements.push(makeText('Location', {
      left: x, top: y + 16, width: 140, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Location', elementLabel: 'Location', bindField: 'location' },
    }));
    elements.push(makeText('Job Title', {
      left: x + 150, top: y, width: 300, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Job Title', elementLabel: 'Job Title', bindField: 'title' },
    }));
    elements.push(makeText('Company Name', {
      left: x + 150, top: y + 18, width: 300, fontSize: 10, fontWeight: '500', fill: MED,
      meta: { ...sm, friendlyLabel: 'Company', elementLabel: 'Company Name', bindField: 'company' },
    }));
    elements.push(createBulletListField({
      items: ['Key responsibility or achievement for this role', 'Another impactful bullet point here'],
      left: x + 150, top: y + 36, width: 350, fontSize: 10, lineHeight: 1.65,
      meta: { ...sm, friendlyLabel: 'Responsibilities', elementLabel: 'Responsibilities', bindField: 'responsibilities' },
    }));
  } else if (layout === 'grid') {
    // 2x2 layout: Title/Company left, Date/Location right, Desc below
    elements.push(makeText('Job Title', {
      left: x, top: y, width: 240, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Job Title', elementLabel: 'Job Title', bindField: 'title' },
    }));
    elements.push(makeText('Company Name', {
      left: x, top: y + 18, width: 240, fontSize: 10, fontWeight: '500', fill: MED,
      meta: { ...sm, friendlyLabel: 'Company', elementLabel: 'Company Name', bindField: 'company' },
    }));
    elements.push(makeText('MM/YYYY – Present', {
      left: x + 250, top: y, width: 200, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Dates', elementLabel: 'Date Range', bindField: 'start_date' },
    }));
    elements.push(makeText('Location', {
      left: x + 250, top: y + 15, width: 200, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Location', elementLabel: 'Location', bindField: 'location' },
    }));
    elements.push(createBulletListField({
      items: ['Key responsibility or achievement for this role', 'Another impactful bullet point here'],
      left: x, top: y + 40, width: 450, fontSize: 10, lineHeight: 1.65,
      meta: { ...sm, friendlyLabel: 'Responsibilities', elementLabel: 'Responsibilities', bindField: 'responsibilities' },
    }));
  } else {
    // Default (full-list)
    elements.push(makeText('Job Title', {
      left: x, top: y, width: 300, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Job Title', elementLabel: 'Job Title', bindField: 'title' },
    }));
    elements.push(makeText('Company Name', {
      left: x, top: y + 18, width: 240, fontSize: 10, fontWeight: '500', fill: MED,
      meta: { ...sm, friendlyLabel: 'Company', elementLabel: 'Company Name', bindField: 'company' },
    }));
    elements.push(makeText('MM/YYYY – Present', {
      left: x + 260, top: y + 18, width: 175, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Dates', elementLabel: 'Date Range', bindField: 'start_date' },
    }));
    elements.push(makeText('Location', {
      left: x, top: y + 33, width: 240, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Location', elementLabel: 'Location', bindField: 'location' },
    }));
    elements.push(createBulletListField({
      items: ['Key responsibility or achievement for this role', 'Another impactful bullet point here'],
      left: x, top: y + 51, width: 435, fontSize: 10, lineHeight: 1.65,
      meta: { ...sm, friendlyLabel: 'Responsibilities', elementLabel: 'Responsibilities', bindField: 'responsibilities' },
    }));
  }

  return elements;
}

export function createEducationSection(opts = {}, layout = 'full-list') {
  const gid = uid();
  const x   = opts.left || 40;
  let   y   = opts.top  || 300;
  const sid = opts.sectionId || 'education';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Education',
    sectionOrder: opts.sectionOrder || 4,
    isOptional: true,
    aiContent: false,
    bindParent: 'education',
  };

  const elements = [];
  
  if (layout === 'half-split') {
    elements.push(makeText('Graduation Year', {
      left: x, top: y, width: 140, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Grad. Year', elementLabel: 'Graduation Year', bindField: 'graduation_year' },
    }));
    elements.push(makeText('GPA / Grade', {
      left: x, top: y + 15, width: 140, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'GPA', elementLabel: 'GPA / Grade', bindField: 'gpa' },
    }));
    elements.push(makeText('Institution Name', {
      left: x + 150, top: y, width: 310, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Institution', elementLabel: 'Institution Name', bindField: 'institution' },
    }));
    elements.push(makeText('Degree / Field of Study', {
      left: x + 150, top: y + 18, width: 300, fontSize: 10, fill: MED,
      meta: { ...sm, friendlyLabel: 'Degree', elementLabel: 'Degree', bindField: 'degree' },
    }));
  } else if (layout === 'grid') {
    elements.push(makeText('Institution Name', {
      left: x, top: y, width: 240, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Institution', elementLabel: 'Institution Name', bindField: 'institution' },
    }));
    elements.push(makeText('Degree / Field of Study', {
      left: x, top: y + 18, width: 240, fontSize: 10, fill: MED,
      meta: { ...sm, friendlyLabel: 'Degree', elementLabel: 'Degree', bindField: 'degree' },
    }));
    elements.push(makeText('Graduation Year', {
      left: x + 250, top: y, width: 200, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Grad. Year', elementLabel: 'Graduation Year', bindField: 'graduation_year' },
    }));
    elements.push(makeText('GPA / Grade', {
      left: x + 250, top: y + 15, width: 200, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'GPA', elementLabel: 'GPA / Grade', bindField: 'gpa' },
    }));
  } else {
    // Default full-list
    elements.push(makeText('Institution Name', {
      left: x, top: y, width: 310, fontSize: 12, fontWeight: '700', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Institution', elementLabel: 'Institution Name', bindField: 'institution' },
    }));
    elements.push(makeText('Degree / Field of Study', {
      left: x, top: y + 18, width: 300, fontSize: 10, fill: MED,
      meta: { ...sm, friendlyLabel: 'Degree', elementLabel: 'Degree', bindField: 'degree' },
    }));
    elements.push(makeText('Graduation Year', {
      left: x + 310, top: y + 18, width: 125, fontSize: 10, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'Grad. Year', elementLabel: 'Graduation Year', bindField: 'graduation_year' },
    }));
    elements.push(makeText('GPA / Grade', {
      left: x, top: y + 32, width: 200, fontSize: 9, fill: MUTED,
      meta: { ...sm, friendlyLabel: 'GPA', elementLabel: 'GPA / Grade', bindField: 'gpa' },
    }));
  }

  return elements;
}

export function createSkillsSection(opts = {}, layout = 'full-list') {
  const gid = uid();
  const x   = opts.left || 40;
  let   y   = opts.top  || 400;
  const sid = opts.sectionId || 'skills';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Skills',
    sectionOrder: opts.sectionOrder || 5,
    isOptional: true,
    aiContent: false
  };

  const elements = [];

  if (layout === 'half-split') {
    elements.push(makeText('Category Name', {
      left: x, top: y, width: 140, fontSize: 11, fontWeight: '600', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Category', elementLabel: 'Category Name' },
    }));
    elements.push(createBulletListField({
      items: ['Skill 1', 'Skill 2', 'Skill 3'],
      left: x + 150, top: y, width: 300, fontSize: 10, lineHeight: 1.5,
      meta: { ...sm, friendlyLabel: 'Skills List', elementLabel: 'Skills List', displayStyle: 'badges', bindParent: 'skills', bindField: 'technical' },
    }));
  } else if (layout === 'grid') {
    elements.push(makeText('Category Name', {
      left: x, top: y, width: 240, fontSize: 11, fontWeight: '600', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Category', elementLabel: 'Category Name' },
    }));
    elements.push(createBulletListField({
      items: ['Skill 1', 'Skill 2', 'Skill 3'],
      left: x, top: y + 18, width: 240, fontSize: 10, lineHeight: 1.5,
      meta: { ...sm, friendlyLabel: 'Skills List', elementLabel: 'Skills List', displayStyle: 'badges', bindParent: 'skills', bindField: 'technical' },
    }));
  } else {
    // Default
    elements.push(makeText('Category Name', {
      left: x, top: y, width: 400, fontSize: 11, fontWeight: '600', fill: DARK,
      meta: { ...sm, friendlyLabel: 'Category', elementLabel: 'Category Name' },
    }));
    elements.push(createBulletListField({
      items: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5'],
      left: x, top: y + 20, width: 435, fontSize: 10, lineHeight: 1.5,
      meta: { ...sm, friendlyLabel: 'Skills List', elementLabel: 'Skills List', displayStyle: 'badges', bindParent: 'skills', bindField: 'technical' },
    }));
  }

  return elements;
}

export function createCertificationsSection(opts = {}) {
  const gid = uid();
  const x   = opts.left || 40;
  let   y   = opts.top  || 450;
  const sid = opts.sectionId || 'certifications';
  const sm  = { 
    sectionGroupId: gid, 
    templateRole: 'field',
    sectionId: sid,
    sectionName: opts.sectionName || 'Certifications',
    sectionOrder: opts.sectionOrder || 6,
    isOptional: true,
    aiContent: false
  };

  const name = makeText('Certification Name', {
    left: x, top: y, width: 280, fontSize: 11, fontWeight: '600', fill: DARK,
    meta: { ...sm, friendlyLabel: 'Cert Name', elementLabel: 'Certification Name', isElementLocked: false },
  });
  y += 16;

  const issuer = makeText('Issuer', {
    left: x, top: y, width: 190, fontSize: 10, fill: MED,
    meta: { ...sm, friendlyLabel: 'Issuer', elementLabel: 'Issuer', isElementLocked: false },
  });

  const date = makeText('MM/YYYY', {
    left: x + 200, top: y, width: 90, fontSize: 10, fill: MUTED,
    meta: { ...sm, friendlyLabel: 'Date', elementLabel: 'Date', isElementLocked: false },
  });

  return [name, issuer, date];
}
