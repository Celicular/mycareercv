import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Sparkles, X, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, ChevronRight, Activity, Zap } from 'lucide-react';
import { calculateATSScore } from '../../utils/atsScorer';
import { grammarCheckText } from '../../api/resumeApi';

export default function AIAssistantPanel({ onClose }) {
  const { resumeData, rebindCanvas, canvasRef } = useEditor();
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState(null); // null means haven't checked yet
  const [atsResult, setAtsResult] = useState(calculateATSScore(resumeData));

  // Recalculate ATS score when data changes
  useEffect(() => {
    setAtsResult(calculateATSScore(resumeData));
  }, [resumeData]);

  const runCheck = async () => {
    if (!resumeData) return;
    setIsChecking(true);
    
    // Extract text block for checking
    let fullText = "";
    if (resumeData.identity?.summary) {
      fullText += "SUMMARY:\n" + resumeData.identity.summary + "\n\n";
    }
    if (resumeData.work_experience) {
      fullText += "EXPERIENCE:\n";
      resumeData.work_experience.forEach(job => {
        if (job.title) fullText += job.title + "\n";
        if (job.responsibilities) fullText += job.responsibilities.join("\n") + "\n";
      });
    }

    try {
      const res = await grammarCheckText(fullText);
      setIssues(res.issues || []);
    } catch (err) {
      console.error('Failed to run grammar check:', err);
      // Fallback or show error toast
      setIssues([]);
    } finally {
      setIsChecking(false);
    }
  };

  const scoreColor = atsResult.scaled >= 90 ? 'text-green-400' : atsResult.scaled >= 80 ? 'text-yellow-400' : 'text-brand-orange';

  return (
    <aside className="w-[300px] shrink-0 h-full bg-[#16161a] border-r border-white/5 flex flex-col shadow-2xl z-10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-[#16161a]/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-orange/20 flex items-center justify-center text-brand-orange">
            <Sparkles size={13} />
          </div>
          <h2 className="text-sm font-semibold text-white/90 tracking-tight">AI Assistant</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-[#2A2A30] transition-colors"
          title="Close AI Panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 editor-panel-scroll">
        
        {/* ATS Score Section */}
        <div className="bg-[#2A2A30]/50 border border-white/5 rounded-xl p-4 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange/20 via-brand-orange to-brand-orange/20 opacity-50"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">ATS Optimization</span>
          <div className="relative flex items-center justify-center mb-1">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-black/40" />
              <circle 
                cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                className={scoreColor}
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * atsResult.scaled) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black tabular-nums tracking-tighter ${scoreColor}`}>{atsResult.scaled}</span>
            </div>
          </div>
          <p className="text-xs text-white/50 text-center max-w-[200px]">
            {atsResult.scaled >= 90 ? "Excellent structure and keywords." : "Good, but could use more action verbs."}
          </p>
          
          {/* Breakdown */}
          <div className="w-full mt-4 space-y-2">
            <ScoreBar label="Summary" score={atsResult.breakdown.summary.score} max={atsResult.breakdown.summary.max} />
            <ScoreBar label="Experience" score={atsResult.breakdown.experience.score} max={atsResult.breakdown.experience.max} />
            <ScoreBar label="Skills" score={atsResult.breakdown.skills.score} max={atsResult.breakdown.skills.max} />
          </div>
        </div>

        {/* Grammar & Content Checker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Content Audit</span>
            <button
              onClick={runCheck}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw size={10} className={isChecking ? "animate-spin" : ""} />
              {issues ? "Re-scan" : "Scan Resume"}
            </button>
          </div>

          {!issues && !isChecking && (
            <div className="text-center py-6 border border-white/5 border-dashed rounded-xl bg-white/[0.02]">
              <Activity size={24} className="mx-auto text-white/20 mb-2" />
              <p className="text-xs text-white/50">Scan your resume for grammar errors, passive voice, and weak phrasing.</p>
            </div>
          )}

          {isChecking && (
            <div className="text-center py-8">
              <RefreshCw size={24} className="mx-auto text-brand-orange animate-spin mb-3" />
              <p className="text-xs text-white/60 animate-pulse">AI analyzing your document...</p>
            </div>
          )}

          {issues && !isChecking && issues.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle size={16} className="text-green-400" />
              <p className="text-xs text-green-200">No issues found! Your content is clean.</p>
            </div>
          )}

          {issues && !isChecking && issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <div key={idx} className="bg-[#2A2A30] border border-white/5 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    {issue.severity === 'error' ? (
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                    ) : (
                      <Zap size={14} className="text-brand-orange shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white/90 leading-tight">{issue.message}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{issue.type}</p>
                    </div>
                  </div>
                  
                  <div className="pl-6 space-y-1.5 mt-2">
                    <div className="bg-red-500/10 border border-red-500/10 rounded p-1.5 line-through text-red-200 text-xs">
                      {issue.original}
                    </div>
                    <div className="bg-green-500/10 border border-green-500/10 rounded p-1.5 text-green-200 text-xs">
                      {issue.suggestion}
                    </div>
                  </div>
                  
                  <div className="mt-3 pl-6">
                    <button 
                      onClick={() => {
                        if (!canvasRef?.current) return;
                        const c = canvasRef.current;
                        const target = c.getObjects().find(o => o.text && o.text.includes(issue.original));
                        if (target) {
                          c.setActiveObject(target);
                          c.requestRenderAll();
                        } else {
                          // Try looser match
                          const words = issue.original.split(' ').slice(0, 3).join(' ');
                          const loose = c.getObjects().find(o => o.text && o.text.includes(words));
                          if (loose) {
                            c.setActiveObject(loose);
                            c.requestRenderAll();
                          } else {
                            alert("Couldn't find the exact text on the canvas.");
                          }
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-orange hover:text-[#E65100] transition-colors"
                    >
                      Fix on Canvas <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </aside>
  );
}

function ScoreBar({ label, score, max }) {
  const percent = (score / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold text-white/60 mb-1">
        <span>{label}</span>
        <span>{score}/{max}</span>
      </div>
      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-orange/80 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
