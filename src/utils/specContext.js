const fs = require('fs').promises;

const HEADING_KEYWORDS = {
  objectives: ['objectifs', 'objectif', 'goals', 'objectives', 'mission'],
  tech: ['tech', 'stack', 'technologies', 'architecture'],
  constraints: ['contraintes', 'constraints', 'risques', 'limitations'],
};

function extractSection(content, keywords) {
  if (!content) return '';
  for (const keyword of keywords) {
    const regex = new RegExp(`(?:^|\\n)#{2,3}\\s+[^\\n]*${keyword}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s+|$)`, 'i');
    const match = content.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractBullets(sectionText) {
  if (!sectionText) return [];
  return sectionText
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

function summarizeIntro(content) {
  if (!content) return '';
  const cleaned = content.replace(/\r/g, '').trim();
  const firstHeading = cleaned.search(/\n#{2,3}\s+/);
  const intro = firstHeading > 0 ? cleaned.slice(0, firstHeading) : cleaned;
  const paragraphs = intro.split(/\n\n+/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  const first = paragraphs[0] || '';
  return first.replace(/^#+\s*/, '').trim();
}

function extractPlanHighlights(planContent) {
  if (!planContent) return [];
  const highlights = [];
  const regexes = [
    /###\s+Étape\s+\d+\s*:\s*([^\n]+)/gi,
    /###\s+Step\s+\d+\s*:\s*([^\n]+)/gi,
    /####\s+Step\s+\d+\s*:\s*([^\n]+)/gi,
  ];
  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(planContent)) !== null) {
      highlights.push(match[1].trim());
      if (highlights.length >= 5) break;
    }
    if (highlights.length >= 5) break;
  }
  return highlights;
}

class SpecContext {
  static async buildContext({ specPath, planPath } = {}) {
    let specContent = '';
    let planContent = '';

    if (specPath) {
      try {
        specContent = await fs.readFile(specPath, 'utf-8');
      } catch (error) {
        // ignore missing spec
      }
    }

    if (planPath) {
      try {
        planContent = await fs.readFile(planPath, 'utf-8');
      } catch (error) {
        // ignore missing plan
      }
    }

    const summary = summarizeIntro(specContent);
    const objectiveSection = extractSection(specContent, HEADING_KEYWORDS.objectives);
    const techSection = extractSection(specContent, HEADING_KEYWORDS.tech);
    const constraintSection = extractSection(specContent, HEADING_KEYWORDS.constraints);

    return {
      summary,
      keyObjectives: extractBullets(objectiveSection).slice(0, 5),
      techStack: extractBullets(techSection).slice(0, 8),
      constraints: extractBullets(constraintSection).slice(0, 5),
      planHighlights: extractPlanHighlights(planContent),
    };
  }
}

module.exports = SpecContext;
