import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, X,
  User, Mail, Briefcase, GraduationCap, Wrench,
  FolderGit2, Award, BookOpen, Trophy, Heart,
  Save, Loader2, Check, SkipForward, Camera, LayoutTemplate, Image, Sparkles
} from 'lucide-react';
import { saveResume, uploadPhoto } from '../../api/resumeApi';
import { listTemplates } from '../../api/templateApi';
import AIEnhancementModal from './AIEnhancementModal';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const emptyWork       = () => ({ _id: uid(), company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, responsibilities: [''] });
const emptyEducation  = () => ({ _id: uid(), institution: '', degree: '', field_of_study: '', graduation_year: '', gpa: '', honors: '' });
const emptyProject    = () => ({ _id: uid(), name: '', description: '', technologies: [], url: '', date: '' });
const emptyCert       = () => ({ _id: uid(), name: '', issuer: '', date: '', credential_id: '', url: '' });
const emptyAward      = () => ({ _id: uid(), title: '', issuer: '', date: '', description: '' });
const emptyPublication= () => ({ _id: uid(), title: '', publisher: '', date: '', url: '' });
const emptyVolunteer  = () => ({ _id: uid(), organisation: '', role: '', start_date: '', end_date: '', description: '' });

function hydrateInitialData(data) {
  if (!data) return null;
  return {
    ...data,
    document_name: data.document_name || '',
    original_upload_filename: data.original_upload_filename || 'nan',
    profile_pic: data.profile_pic || null,
    template_id: data.template_id || null,
    work_experience:  (data.work_experience  || []).map(w => ({ _id: uid(), ...w, responsibilities: w.responsibilities?.length ? w.responsibilities : [''] })),
    education:        (data.education        || []).map(e => ({ _id: uid(), ...e })),
    projects:         (data.projects         || []).map(p => ({ _id: uid(), ...p, technologies: p.technologies || [] })),
    certifications:   (data.certifications   || []).map(c => ({ _id: uid(), ...c })),
    awards:           (data.awards           || []).map(a => ({ _id: uid(), ...a })),
    publications:     (data.publications     || []).map(p => ({ _id: uid(), ...p })),
    volunteer:        (data.volunteer        || []).map(v => ({ _id: uid(), ...v })),
    skills: { technical: [], soft: [], languages: [], other: [], ...(data.skills || {}) },
  };
}

function cleanForSave(form, included) {
  const strip = arr => arr.map(({ _id, ...rest }) => rest);
  const out = {
    document_name: form.document_name || 'Untitled Resume',
    original_upload_filename: form.original_upload_filename || 'nan',
    full_name:  form.full_name,
    profile_pic: included.profile_pic ? form.profile_pic : null,
    template_id: included.template ? form.template_id : null,
    headline:   form.headline  || null,
    summary:    form.summary   || null,
    contact: {
      email:      form.contact.email,
      phone:      form.contact.phone      || null,
      location:   form.contact.location   || null,
      linkedin:   form.contact.linkedin   || null,
      github:     form.contact.github     || null,
      portfolio:  form.contact.portfolio  || null,
      other_links: form.contact.other_links || [],
    },
    education:        strip(form.education),
    work_experience:  included.work_experience   ? strip(form.work_experience)  : [],
    skills:           included.skills            ? form.skills                  : undefined,
    projects:         included.projects          ? strip(form.projects)         : undefined,
    certifications:   included.certifications    ? strip(form.certifications)   : undefined,
    awards:           included.awards            ? strip(form.awards)           : undefined,
    publications:     included.publications      ? strip(form.publications)     : undefined,
    volunteer:        included.volunteer         ? strip(form.volunteer)        : undefined,
  };
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field primitives
// ─────────────────────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, placeholder = '', type = 'text', required, error }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
        {label}{required && <span className="text-brand-orange ml-0.5">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/20 text-sm outline-none transition-all
        ${error ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-brand-orange focus:bg-white/10'}`}
    />
    {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
  </div>
);

const Textarea = ({ label, value, onChange, placeholder = '', rows = 3 }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">{label}</label>}
    <textarea
      rows={rows}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 text-sm outline-none focus:border-brand-orange focus:bg-white/10 resize-none transition-all"
    />
  </div>
);

// Chip tag input
const TagInput = ({ label, tags, onChange, placeholder = 'Type and press Enter' }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">{label}</label>}
      <div className="min-h-[3rem] flex flex-wrap gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 focus-within:border-brand-orange transition-all">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-xs font-semibold">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-400 transition-colors"><X size={10} /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] text-sm outline-none bg-transparent text-white placeholder:text-white/25"
        />
      </div>
    </div>
  );
};

// Add / Remove card button strip
const AddButton = ({ label, onClick, color = 'border-white/20 text-white/40 hover:border-brand-orange hover:text-brand-orange' }) => (
  <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all ${color}`}>
    <Plus size={14} /> {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step slide animation variants
// ─────────────────────────────────────────────────────────────────────────────
const slideVariants = {
  enter: dir => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  dir => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'profile_pic',    label: 'Profile Pic',     icon: Camera,        optional: true  },
  { id: 'identity',       label: 'Identity',        icon: User,          optional: false },
  { id: 'contact',        label: 'Contact',          icon: Mail,          optional: false },
  { id: 'work_experience',label: 'Experience',       icon: Briefcase,     optional: true  },
  { id: 'education',      label: 'Education',        icon: GraduationCap, optional: false },
  { id: 'skills',         label: 'Skills',           icon: Wrench,        optional: true  },
  { id: 'projects',       label: 'Projects',         icon: FolderGit2,    optional: true  },
  { id: 'certifications', label: 'Certifications',   icon: Award,         optional: true  },
  { id: 'awards',         label: 'Awards',           icon: Trophy,        optional: true  },
  { id: 'publications',   label: 'Publications',     icon: BookOpen,      optional: true  },
  { id: 'volunteer',      label: 'Volunteer',        icon: Heart,         optional: true  },
  { id: 'template',       label: 'Template',         icon: LayoutTemplate,optional: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Individual step views
// ─────────────────────────────────────────────────────────────────────────────

const IdentityStep = ({ form, setField }) => (
  <div className="flex flex-col gap-5">
    <Input label="Resume Document Name" value={form.document_name} onChange={v => setField('document_name', v)} placeholder="e.g. Software Engineer 2026" />
    <Input label="Full Name" value={form.full_name} onChange={v => setField('full_name', v)} placeholder="Jane Doe" required error={!form.full_name?.trim() ? undefined : undefined} />
    <Input label="Professional Headline" value={form.headline} onChange={v => setField('headline', v)} placeholder="Senior Full-Stack Engineer · Open to work" />
    <Textarea label="Professional Summary" value={form.summary} onChange={v => setField('summary', v)} placeholder="A concise paragraph about your background, key strengths, and career goals…" rows={5} />
  </div>
);

const ContactStep = ({ form, setField }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="sm:col-span-2">
      <Input label="Email" value={form.contact.email} onChange={v => setField('contact.email', v)} placeholder="jane@example.com" type="email" required />
    </div>
    <Input label="Phone" value={form.contact.phone} onChange={v => setField('contact.phone', v)} placeholder="+91 98765 43210" />
    <Input label="Location" value={form.contact.location} onChange={v => setField('contact.location', v)} placeholder="Bangalore, India" />
    <Input label="LinkedIn" value={form.contact.linkedin} onChange={v => setField('contact.linkedin', v)} placeholder="linkedin.com/in/janedoe" />
    <Input label="GitHub" value={form.contact.github} onChange={v => setField('contact.github', v)} placeholder="github.com/janedoe" />
    <Input label="Portfolio" value={form.contact.portfolio} onChange={v => setField('contact.portfolio', v)} placeholder="janedoe.dev" />
  </div>
);

const WorkStep = ({ form, setForm }) => {
  const update = (idx, field, val) => setForm(p => { const arr=[...p.work_experience]; arr[idx]={...arr[idx],[field]:val}; return {...p,work_experience:arr}; });
  const updateResp = (idx, rIdx, val) => setForm(p => { const arr=[...p.work_experience]; const resp=[...(arr[idx].responsibilities||[''])]; resp[rIdx]=val; arr[idx]={...arr[idx],responsibilities:resp}; return {...p,work_experience:arr}; });
  const addResp = (idx) => setForm(p => { const arr=[...p.work_experience]; arr[idx]={...arr[idx],responsibilities:[...(arr[idx].responsibilities||[]),'']}; return {...p,work_experience:arr}; });
  const removeResp = (idx,rIdx) => setForm(p => { const arr=[...p.work_experience]; arr[idx]={...arr[idx],responsibilities:(arr[idx].responsibilities||[]).filter((_,i)=>i!==rIdx)}; return {...p,work_experience:arr}; });
  const add    = () => setForm(p => ({...p,work_experience:[...p.work_experience,emptyWork()]}));
  const remove = (idx) => setForm(p => ({...p,work_experience:p.work_experience.filter((_,i)=>i!==idx)}));

  return (
    <div className="flex flex-col gap-6">
      {form.work_experience.map((w, idx) => (
        <div key={w._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-brand-orange uppercase tracking-widest">Position {idx+1}</span>
            {form.work_experience.length > 1 && (
              <button type="button" onClick={() => remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Company" value={w.company} onChange={v=>update(idx,'company',v)} placeholder="Google" />
            <Input label="Job Title" value={w.title} onChange={v=>update(idx,'title',v)} placeholder="Software Engineer" />
            <Input label="Location" value={w.location} onChange={v=>update(idx,'location',v)} placeholder="Remote / Mumbai" />
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id={`curr-${w._id}`} checked={!!w.is_current} onChange={e=>update(idx,'is_current',e.target.checked)} className="w-4 h-4 accent-brand-orange" />
              <label htmlFor={`curr-${w._id}`} className="text-sm text-white/60 font-medium">Currently working here</label>
            </div>
            <Input label="Start Date" value={w.start_date} onChange={v=>update(idx,'start_date',v)} placeholder="MM/YYYY" />
            {!w.is_current && <Input label="End Date" value={w.end_date} onChange={v=>update(idx,'end_date',v)} placeholder="MM/YYYY" />}
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest block mb-2">Key Responsibilities</label>
            <div className="flex flex-col gap-2">
              {(w.responsibilities||['']).map((r,rIdx)=>(
                <div key={rIdx} className="flex items-start gap-2">
                  <span className="text-brand-orange/50 text-sm mt-3 shrink-0">•</span>
                  <textarea rows={2} value={r} onChange={e=>updateResp(idx,rIdx,e.target.value)} placeholder="Describe what you did and the impact…"
                    className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 outline-none focus:border-brand-orange resize-none transition-all" />
                  {(w.responsibilities||['']).length>1 && (
                    <button type="button" onClick={()=>removeResp(idx,rIdx)} className="text-white/20 hover:text-red-400 mt-2 transition-colors shrink-0"><X size={13}/></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={()=>addResp(idx)} className="self-start text-xs font-semibold text-brand-orange/60 hover:text-brand-orange flex items-center gap-1 mt-1 transition-colors">
                <Plus size={11}/> Add bullet
              </button>
            </div>
          </div>
        </div>
      ))}
      <AddButton label="Add another position" onClick={add} />
    </div>
  );
};

const EducationStep = ({ form, setForm }) => {
  const update = (idx,field,val)=>setForm(p=>{const arr=[...p.education];arr[idx]={...arr[idx],[field]:val};return{...p,education:arr};});
  const add    = ()=>setForm(p=>({...p,education:[...p.education,emptyEducation()]}));
  const remove = (idx)=>setForm(p=>({...p,education:p.education.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.education.map((e,idx)=>(
        <div key={e._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-[#00B67A] uppercase tracking-widest">Institution {idx+1}</span>
            {form.education.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Institution" value={e.institution} onChange={v=>update(idx,'institution',v)} placeholder="MIT" /></div>
            <Input label="Degree" value={e.degree} onChange={v=>update(idx,'degree',v)} placeholder="B.Tech Computer Science" />
            <Input label="Field of Study" value={e.field_of_study} onChange={v=>update(idx,'field_of_study',v)} placeholder="Computer Science" />
            <Input label="Graduation Year" value={e.graduation_year} onChange={v=>update(idx,'graduation_year',v)} placeholder="05/2026" />
            <Input label="GPA / Grade" value={e.gpa} onChange={v=>update(idx,'gpa',v)} placeholder="9.0" />
            <div className="sm:col-span-2"><Input label="Honors / Distinctions" value={e.honors} onChange={v=>update(idx,'honors',v)} placeholder="First Class with Distinction" /></div>
          </div>
        </div>
      ))}
      <AddButton label="Add another institution" onClick={add} />
    </div>
  );
};

const SkillsStep = ({ form, setField }) => (
  <div className="flex flex-col gap-6">
    <TagInput label="Technical Skills" tags={form.skills.technical} onChange={v=>setField('skills.technical',v)} placeholder="React, Python, Docker… press Enter" />
    <TagInput label="Soft Skills" tags={form.skills.soft} onChange={v=>setField('skills.soft',v)} placeholder="Leadership, Communication… press Enter" />
    <TagInput label="Languages" tags={form.skills.languages} onChange={v=>setField('skills.languages',v)} placeholder="English (C2), Japanese (N2)… press Enter" />
    <TagInput label="Other" tags={form.skills.other} onChange={v=>setField('skills.other',v)} placeholder="NLP, PyTorch, RAG… press Enter" />
  </div>
);

const ProjectsStep = ({ form, setForm }) => {
  const update=(idx,field,val)=>setForm(p=>{const arr=[...p.projects];arr[idx]={...arr[idx],[field]:val};return{...p,projects:arr};});
  const add=()=>setForm(p=>({...p,projects:[...p.projects,emptyProject()]}));
  const remove=(idx)=>setForm(p=>({...p,projects:p.projects.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.projects.map((p,idx)=>(
        <div key={p._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Project {idx+1}</span>
            {form.projects.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Project Name" value={p.name} onChange={v=>update(idx,'name',v)} placeholder="Portfolio Website" />
            <Input label="Date" value={p.date} onChange={v=>update(idx,'date',v)} placeholder="2024" />
            <div className="sm:col-span-2"><Input label="URL" value={p.url} onChange={v=>update(idx,'url',v)} placeholder="https://github.com/…" /></div>
            <div className="sm:col-span-2"><Textarea label="Description" value={p.description} onChange={v=>update(idx,'description',v)} placeholder="What you built and why it matters…" rows={3} /></div>
            <div className="sm:col-span-2"><TagInput label="Technologies Used" tags={p.technologies||[]} onChange={v=>update(idx,'technologies',v)} placeholder="React, FastAPI… press Enter" /></div>
          </div>
        </div>
      ))}
      <AddButton label="Add another project" onClick={add} />
    </div>
  );
};

const CertificationsStep = ({ form, setForm }) => {
  const update=(idx,field,val)=>setForm(p=>{const arr=[...p.certifications];arr[idx]={...arr[idx],[field]:val};return{...p,certifications:arr};});
  const add=()=>setForm(p=>({...p,certifications:[...p.certifications,emptyCert()]}));
  const remove=(idx)=>setForm(p=>({...p,certifications:p.certifications.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.certifications.map((c,idx)=>(
        <div key={c._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Cert {idx+1}</span>
            {form.certifications.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Certification Name" value={c.name} onChange={v=>update(idx,'name',v)} placeholder="AWS Certified Developer" /></div>
            <Input label="Issuer" value={c.issuer} onChange={v=>update(idx,'issuer',v)} placeholder="Amazon Web Services" />
            <Input label="Date" value={c.date} onChange={v=>update(idx,'date',v)} placeholder="MM/YYYY" />
            <Input label="Credential ID" value={c.credential_id} onChange={v=>update(idx,'credential_id',v)} placeholder="ABC-12345" />
            <Input label="URL" value={c.url} onChange={v=>update(idx,'url',v)} placeholder="https://…" />
          </div>
        </div>
      ))}
      <AddButton label="Add another certification" onClick={add} />
    </div>
  );
};

const AwardsStep = ({ form, setForm }) => {
  const update=(idx,field,val)=>setForm(p=>{const arr=[...p.awards];arr[idx]={...arr[idx],[field]:val};return{...p,awards:arr};});
  const add=()=>setForm(p=>({...p,awards:[...p.awards,emptyAward()]}));
  const remove=(idx)=>setForm(p=>({...p,awards:p.awards.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.awards.map((a,idx)=>(
        <div key={a._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Award {idx+1}</span>
            {form.awards.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Award Title" value={a.title} onChange={v=>update(idx,'title',v)} placeholder="Best Innovation Award" /></div>
            <Input label="Issuer / Event" value={a.issuer} onChange={v=>update(idx,'issuer',v)} placeholder="Hackathon 2024" />
            <Input label="Date" value={a.date} onChange={v=>update(idx,'date',v)} placeholder="MM/YYYY" />
            <div className="sm:col-span-2"><Textarea label="Description" value={a.description} onChange={v=>update(idx,'description',v)} placeholder="What you achieved and why it matters…" rows={2} /></div>
          </div>
        </div>
      ))}
      <AddButton label="Add another award" onClick={add} />
    </div>
  );
};

const PublicationsStep = ({ form, setForm }) => {
  const update=(idx,field,val)=>setForm(p=>{const arr=[...p.publications];arr[idx]={...arr[idx],[field]:val};return{...p,publications:arr};});
  const add=()=>setForm(p=>({...p,publications:[...p.publications,emptyPublication()]}));
  const remove=(idx)=>setForm(p=>({...p,publications:p.publications.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.publications.map((p,idx)=>(
        <div key={p._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Publication {idx+1}</span>
            {form.publications.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Title" value={p.title} onChange={v=>update(idx,'title',v)} placeholder="Paper or article title…" /></div>
            <Input label="Publisher" value={p.publisher} onChange={v=>update(idx,'publisher',v)} placeholder="IEEE, Springer…" />
            <Input label="Date" value={p.date} onChange={v=>update(idx,'date',v)} placeholder="MM/YYYY" />
            <div className="sm:col-span-2"><Input label="URL / DOI" value={p.url} onChange={v=>update(idx,'url',v)} placeholder="https://doi.org/…" /></div>
          </div>
        </div>
      ))}
      <AddButton label="Add another publication" onClick={add} />
    </div>
  );
};

const VolunteerStep = ({ form, setForm }) => {
  const update=(idx,field,val)=>setForm(p=>{const arr=[...p.volunteer];arr[idx]={...arr[idx],[field]:val};return{...p,volunteer:arr};});
  const add=()=>setForm(p=>({...p,volunteer:[...p.volunteer,emptyVolunteer()]}));
  const remove=(idx)=>setForm(p=>({...p,volunteer:p.volunteer.filter((_,i)=>i!==idx)}));
  return (
    <div className="flex flex-col gap-6">
      {form.volunteer.map((v,idx)=>(
        <div key={v._id} className="relative p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Experience {idx+1}</span>
            {form.volunteer.length>1&&<button type="button" onClick={()=>remove(idx)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Organisation" value={v.organisation} onChange={val=>update(idx,'organisation',val)} placeholder="Red Cross" />
            <Input label="Role" value={v.role} onChange={val=>update(idx,'role',val)} placeholder="Community Coordinator" />
            <Input label="Start Date" value={v.start_date} onChange={val=>update(idx,'start_date',val)} placeholder="MM/YYYY" />
            <Input label="End Date" value={v.end_date} onChange={val=>update(idx,'end_date',val)} placeholder="MM/YYYY or Present" />
            <div className="sm:col-span-2"><Textarea label="Description" value={v.description} onChange={val=>update(idx,'description',val)} placeholder="What you did and the impact…" rows={2} /></div>
          </div>
        </div>
      ))}
      <AddButton label="Add another experience" onClick={add} />
    </div>
  );
};

const ProfilePicStep = ({ form, setField }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadPhoto(file);
      setField('profile_pic', res.url);
    } catch (err) {
      setError('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-40 h-40 rounded-full border-4 border-white/10 bg-white/5 flex flex-col items-center justify-center overflow-hidden group">
        {form.profile_pic ? (
          <img src={import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') + form.profile_pic : `http://localhost:8000${form.profile_pic}`} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User size={48} className="text-white/20" />
        )}
        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
          {uploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white mb-1" />}
          <span className="text-xs font-semibold text-white">{uploading ? 'Uploading...' : 'Upload Photo'}</span>
          <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>
      {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
      {form.profile_pic && (
        <button type="button" onClick={() => setField('profile_pic', null)} className="text-xs font-semibold text-red-400 hover:text-red-300">
          Remove Photo
        </button>
      )}
    </div>
  );
};

const TemplateStep = ({ form, setField }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTemplates().then(data => {
      setTemplates(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-orange" size={32} /></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => setField('enhanceWithAI', true)}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${form.enhanceWithAI ? 'border-brand-orange bg-brand-orange/10 shadow-[0_0_15px_rgba(255,107,0,0.1)]' : 'border-white/10 hover:border-white/20'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.enhanceWithAI ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/40'}`}>
              <Sparkles size={16} />
            </div>
            <h3 className="font-bold text-white text-sm">Enhance with AI</h3>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Automatically rewrites your bullet points and descriptions for maximum ATS compatibility and impact.
          </p>
        </div>

        <div 
          onClick={() => setField('enhanceWithAI', false)}
          className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${!form.enhanceWithAI ? 'border-brand-orange bg-brand-orange/10 shadow-[0_0_15px_rgba(255,107,0,0.1)]' : 'border-white/10 hover:border-white/20'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!form.enhanceWithAI ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/40'}`}>
              <Check size={16} />
            </div>
            <h3 className="font-bold text-white text-sm">Keep it Original</h3>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Uses your exact wording without any AI modifications. Best if you've already optimized your resume.
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest block mb-4">Select Template</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {templates.map(t => (
        <div key={t.id} onClick={() => setField('template_id', t.id)}
          className={`cursor-pointer rounded-2xl border-2 transition-all overflow-hidden ${form.template_id === t.id ? 'border-brand-orange shadow-[0_0_15px_rgba(255,107,0,0.3)]' : 'border-white/10 hover:border-white/30'}`}>
          <div className="aspect-[1/1.4] bg-white/5 flex items-center justify-center relative">
            {t.thumbnail_b64 ? (
              <img src={t.thumbnail_b64} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <LayoutTemplate size={32} className="text-white/20" />
            )}
            {form.template_id === t.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
          </div>
          <div className="p-3 bg-brand-dark/50">
            <p className="text-sm font-semibold text-white truncate text-center">{t.name}</p>
          </div>
        </div>
      ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step meta — question title and subtitle per step
// ─────────────────────────────────────────────────────────────────────────────
const STEP_COPY = {
  profile_pic:    { q: "Put a face to the name.", sub: "Upload a professional profile picture." },
  template:       { q: "Choose a template.", sub: "Select how you want your resume to look." },
  identity:       { q: "Let's start with the basics.", sub: "Your name, headline, and a short professional summary." },
  contact:        { q: "How can employers reach you?",  sub: "Email is required. Everything else is optional but recommended." },
  work_experience:{ q: "Walk us through your work history.", sub: "Add your positions — most recent first. Toggle off if you're a fresher." },
  education:      { q: "What's your educational background?", sub: "Add all relevant degrees, diplomas, or certifications." },
  skills:         { q: "What are your strongest skills?", sub: "Add chips by typing and pressing Enter. Skip if not applicable." },
  projects:       { q: "Any projects you're proud of?", sub: "Personal or professional — anything that shows your work." },
  certifications: { q: "Any certifications to your name?", sub: "Issued by Coursera, AWS, Google, or anywhere else." },
  awards:         { q: "Awards or achievements worth noting?", sub: "Hackathons, recognition, scholarships — go ahead and brag." },
  publications:   { q: "Have you published any work?", sub: "Papers, blog posts, articles — link them here." },
  volunteer:      { q: "Any volunteer or community work?", sub: "Shows character. Add roles from NGOs, open-source, or events." },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Wizard Component
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  document_name: '', original_upload_filename: 'nan',
  profile_pic: null, template_id: null,
  full_name: '', headline: '', summary: '',
  contact: { email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', other_links: [] },
  work_experience: [emptyWork()],
  education: [emptyEducation()],
  skills: { technical: [], soft: [], languages: [], other: [] },
  projects: [emptyProject()],
  certifications: [emptyCert()],
  awards: [emptyAward()],
  publications: [emptyPublication()],
  volunteer: [emptyVolunteer()],
};

const DEFAULT_INCLUDED = {
  profile_pic: true,
  template: true,
  work_experience: true,
  skills: true,
  projects: false,
  certifications: false,
  awards: false,
  publications: false,
  volunteer: false,
};

export default function ResumeBuilderForm({ initialData = null, mode = 'scratch', originalUploadFilename = 'nan', onClose }) {
  const navigate = useNavigate();
  const hydrated = hydrateInitialData(initialData);

  const [form, setForm] = useState(() => hydrated ? {
    document_name:  hydrated.document_name || '',
    original_upload_filename: hydrated.original_upload_filename && hydrated.original_upload_filename !== 'nan' ? hydrated.original_upload_filename : originalUploadFilename,
    profile_pic:    hydrated.profile_pic || null,
    template_id:    hydrated.template_id || null,
    enhanceWithAI:  true,
    full_name:      hydrated.full_name  || '',
    headline:       hydrated.headline   || '',
    summary:        hydrated.summary    || '',
    contact: { email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', other_links: [], ...(hydrated.contact || {}) },
    work_experience:  hydrated.work_experience?.length  ? hydrated.work_experience  : [emptyWork()],
    education:        hydrated.education?.length        ? hydrated.education        : [emptyEducation()],
    skills:           hydrated.skills || { technical: [], soft: [], languages: [], other: [] },
    projects:         hydrated.projects?.length         ? hydrated.projects         : [emptyProject()],
    certifications:   hydrated.certifications?.length   ? hydrated.certifications   : [emptyCert()],
    awards:           hydrated.awards?.length           ? hydrated.awards           : [emptyAward()],
    publications:     hydrated.publications?.length     ? hydrated.publications     : [emptyPublication()],
    volunteer:        hydrated.volunteer?.length        ? hydrated.volunteer        : [emptyVolunteer()],
  } : DEFAULT_FORM);

  const [included, setIncluded] = useState(() => hydrated ? {
    profile_pic:      true,
    template:         true,
    work_experience:  !!(hydrated.work_experience?.length),
    skills:           !!(hydrated.skills && Object.values(hydrated.skills).some(a => a?.length)),
    projects:         !!(hydrated.projects?.length),
    certifications:   !!(hydrated.certifications?.length),
    awards:           !!(hydrated.awards?.length),
    publications:     !!(hydrated.publications?.length),
    volunteer:        !!(hydrated.volunteer?.length),
  } : DEFAULT_INCLUDED);

  const [stepIdx, setStepIdx]   = useState(0);
  const [dir, setDir]           = useState(1);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const currentStep = STEPS[stepIdx];
  const copy = STEP_COPY[currentStep.id];
  const isLast = stepIdx === STEPS.length - 1;
  const isOptional = currentStep.optional;

  // ── Setters ──────────────────────────────────────────────────────────────
  const setField = useCallback((path, value) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────
  const go = (delta) => {
    const errs = validateCurrent();
    if (delta > 0 && Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setDir(delta);
    setStepIdx(i => Math.min(Math.max(i + delta, 0), STEPS.length - 1));
  };

  const skip = () => {
    setDir(1);
    setErrors({});
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    setIncluded(p => ({ ...p, [currentStep.id]: false }));
  };

  // ── Per-step validation ──────────────────────────────────────────────────
  const validateCurrent = () => {
    const errs = {};
    if (currentStep.id === 'identity' && !form.full_name.trim()) errs.full_name = 'Full name is required.';
    if (currentStep.id === 'contact'  && !form.contact.email.trim()) errs['contact.email'] = 'Email is required.';
    return errs;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (form.enhanceWithAI) {
      setShowAIModal(true);
    } else {
      finalSave(form);
    }
  };

  const finalSave = async (payloadToSave) => {
    setSaveError('');
    setSaving(true);
    try {
      const res = await saveResume(cleanForSave(payloadToSave, included));
      onClose?.();
      if (payloadToSave.template_id) {
        navigate(`/template-editor/${payloadToSave.template_id}?resume_id=${res.resume_id}`);
      }
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
      setShowAIModal(false);
    }
  };

  // ── Render step body ─────────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep.id) {
      case 'profile_pic':    return <ProfilePicStep     form={form} setField={setField} />;
      case 'template':       return <TemplateStep       form={form} setField={setField} />;
      case 'identity':       return <IdentityStep       form={form} setField={setField} errors={errors} />;
      case 'contact':        return <ContactStep        form={form} setField={setField} errors={errors} />;
      case 'work_experience':return <WorkStep           form={form} setForm={setForm} />;
      case 'education':      return <EducationStep      form={form} setForm={setForm} />;
      case 'skills':         return <SkillsStep         form={form} setField={setField} />;
      case 'projects':       return <ProjectsStep       form={form} setForm={setForm} />;
      case 'certifications': return <CertificationsStep form={form} setForm={setForm} />;
      case 'awards':         return <AwardsStep         form={form} setForm={setForm} />;
      case 'publications':   return <PublicationsStep   form={form} setForm={setForm} />;
      case 'volunteer':      return <VolunteerStep      form={form} setForm={setForm} />;
      default:               return null;
    }
  };

  const Icon = currentStep.icon;
  const progressPct = ((stepIdx) / (STEPS.length - 1)) * 100;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showAIModal && (
        <AIEnhancementModal 
          form={form} 
          onComplete={finalSave} 
          onCancel={() => setShowAIModal(false)} 
        />
      )}
      
      <div className="fixed inset-0 z-[110] bg-brand-dark flex flex-col overflow-hidden font-body">

      {/* ── Top progress strip ─────────────────────────────────────────────── */}
      <div className="h-1 w-full bg-white/5 shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac"
          animate={{ width: `${progressPct}%` }}
          transition={{ ease: 'easeOut', duration: 0.5 }}
        />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <button
          type="button"
          onClick={stepIdx === 0 ? onClose : () => go(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          {stepIdx === 0 ? 'Back to Dashboard' : 'Previous'}
        </button>

        {/* Step pills */}
        <div className="hidden sm:flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < stepIdx  ? 'w-4 bg-brand-orange/60' :
                i === stepIdx ? 'w-6 bg-brand-orange' :
                'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        <span className="text-sm font-semibold text-white/30">
          {stepIdx + 1} / {STEPS.length}
        </span>
      </div>

      {/* ── Main scrollable area ────────────────────────────────────────────── */}
      {/* data-lenis-prevent stops Lenis from hijacking wheel events inside the fixed overlay */}
      <div className="flex-1 overflow-y-auto builder-scroll" data-lenis-prevent>
        <div className="max-w-2xl mx-auto px-6 py-10 pb-32">

          {/* Step hero */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={currentStep.id}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Icon + Label */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-orange uppercase tracking-[0.15em]">{currentStep.label}</p>
                  {isOptional && (
                    <p className="text-xs text-white/25 font-medium mt-0.5">Optional section</p>
                  )}
                </div>
              </div>

              {/* Hero question */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
                {copy.q}
              </h1>
              <p className="text-base text-white/40 font-medium mb-10 leading-relaxed">
                {copy.sub}
              </p>

              {/* Step content */}
              {renderStep()}

              {/* Validation error summary */}
              {Object.keys(errors).length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium flex items-center gap-2">
                  <X size={14} className="shrink-0" />
                  {Object.values(errors)[0]}
                </motion.div>
              )}

              {saveError && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium">
                  {saveError}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky bottom action bar ─────────────────────────────────────────── */}
      <div className="border-t border-white/5 bg-brand-dark/90 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        {/* Skip (optional sections only) */}
        <div className="flex-1">
          {isOptional && (
            <button type="button" onClick={skip}
              className="flex items-center gap-1.5 text-sm font-semibold text-white/25 hover:text-white/50 transition-colors">
              <SkipForward size={14} /> Skip this section
            </button>
          )}
        </div>

        {/* Next / Finish */}
        {isLast ? (
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand-orange text-white text-sm font-bold shadow-xl shadow-brand-orange/30 hover:bg-brand-orange/90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Finish & Save'}
          </button>
        ) : (
          <button type="button" onClick={() => go(1)}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-brand-orange text-white text-sm font-bold shadow-xl shadow-brand-orange/30 hover:bg-brand-orange/90 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            Next <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
    </>
  );
}
