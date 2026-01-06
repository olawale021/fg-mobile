import { TestAnswers, ScoreResult, ScoreBand } from '@/types';

export function calculateScore(answers: TestAnswers): ScoreResult {
  // Sum up points from Q1-Q9
  const totalPoints =
    answers.q1 +
    answers.q2 +
    answers.q3 +
    answers.q4 +
    answers.q5 +
    answers.q6 +
    answers.q7 +
    answers.q8 +
    answers.q9;

  const maxPoints = 27; // Maximum possible score

  // Convert to 0-100 scale
  const baseScore = Math.round((totalPoints / maxPoints) * 100);

  // Determine score band
  let scoreBand: ScoreBand;
  if (baseScore <= 40) {
    scoreBand = 'early-stage';
  } else if (baseScore <= 70) {
    scoreBand = 'developing';
  } else if (baseScore <= 90) {
    scoreBand = 'strong';
  } else {
    scoreBand = 'ready';
  }

  return {
    baseScore,
    scoreBand,
    totalPoints,
    maxPoints,
  };
}

export function getScoreBandLabel(scoreBand: ScoreBand): string {
  const labels: Record<ScoreBand, string> = {
    'early-stage': 'Early-Stage',
    'developing': 'Developing',
    'strong': 'Strong',
    'ready': 'Ready',
  };
  return labels[scoreBand];
}

export function getScoreBandDescription(scoreBand: ScoreBand): string {
  const descriptions: Record<ScoreBand, string> = {
    'early-stage': "You're just getting started. Focus on clarifying your problem and talking to potential customers.",
    'developing': "You're making progress! Continue validating your idea and building your prototype.",
    'strong': "You're on a solid path. Keep executing and building traction.",
    'ready': "You're ready to take the next big step. Time to accelerate!",
  };
  return descriptions[scoreBand];
}
