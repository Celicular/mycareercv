/**
 * Analyzes resumeData to produce an ATS score (0-100) and section breakdowns.
 * To avoid discouraging users, the raw score (0-100) is scaled to a visual 75-98 range.
 */
export function calculateATSScore(resumeData) {
  if (!resumeData) return { total: 0, scaled: 0, breakdown: {} };

  let rawScore = 0;
  const maxScore = 100;
  
  const breakdown = {
    summary: { score: 0, max: 20 },
    experience: { score: 0, max: 40 },
    skills: { score: 0, max: 20 },
    other: { score: 0, max: 20 },
  };

  // 1. Summary Analysis (20 pts)
  const summary = resumeData.identity?.summary || '';
  const wordCount = summary.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount >= 50 && wordCount <= 150) {
    breakdown.summary.score += 20; // Ideal length
  } else if (wordCount > 10) {
    breakdown.summary.score += 10; // Too short or too long
  }
  
  // Deduct for first person in summary
  if (/\b(I|me|my)\b/i.test(summary)) {
    breakdown.summary.score = Math.max(0, breakdown.summary.score - 5);
  }

  // 2. Experience Analysis (40 pts)
  const exp = resumeData.work_experience || [];
  if (exp.length > 0) {
    let expScore = 0;
    let bulletsWithNumbers = 0;
    let bulletsWithActionVerbs = 0;
    
    // Action verbs to look for
    const actionVerbs = /\b(led|managed|created|developed|built|increased|decreased|reduced|improved|implemented|designed|orchestrated|spearheaded|achieved)\b/i;
    // Quantified metrics
    const numbers = /\d+%|\$\d+|\d+x|\b\d+\b/i;
    
    let totalBullets = 0;
    
    exp.forEach(job => {
      const resp = job.responsibilities || [];
      totalBullets += resp.length;
      resp.forEach(bullet => {
        if (actionVerbs.test(bullet)) bulletsWithActionVerbs++;
        if (numbers.test(bullet)) bulletsWithNumbers++;
      });
    });
    
    if (totalBullets > 0) {
      // 20 points for action verbs
      expScore += Math.min(20, (bulletsWithActionVerbs / totalBullets) * 20);
      // 20 points for quantified metrics (expecting at least 30% of bullets to have numbers)
      expScore += Math.min(20, (bulletsWithNumbers / (totalBullets * 0.3)) * 20);
    } else {
      expScore = 10; // Base score for having experience but no bullets
    }
    
    breakdown.experience.score = Math.round(expScore);
  }

  // 3. Skills Analysis (20 pts)
  const skills = resumeData.skills || {};
  const techSkillsCount = (skills.technical || []).length;
  const softSkillsCount = (skills.soft || []).length;
  
  if (techSkillsCount >= 5) breakdown.skills.score += 10;
  else if (techSkillsCount > 0) breakdown.skills.score += 5;
  
  if (softSkillsCount >= 3) breakdown.skills.score += 10;
  else if (softSkillsCount > 0) breakdown.skills.score += 5;

  // 4. Other completeness (20 pts)
  // Education, contact info
  if (resumeData.contact?.email) breakdown.other.score += 5;
  if (resumeData.contact?.phone) breakdown.other.score += 5;
  if (resumeData.contact?.linkedin || resumeData.contact?.github || resumeData.contact?.portfolio) {
    breakdown.other.score += 5;
  }
  if (resumeData.education?.length > 0) breakdown.other.score += 5;

  // Total raw score
  rawScore = breakdown.summary.score + breakdown.experience.score + breakdown.skills.score + breakdown.other.score;
  
  // Floor + Scale: 75 to 98
  // 0 -> 75, 100 -> 98
  const scaledScore = Math.round(75 + (rawScore / 100) * 23);

  return {
    raw: rawScore,
    scaled: scaledScore,
    breakdown
  };
}
