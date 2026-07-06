import { PASS_THRESHOLD } from "@/lib/constants";
import type { DragPair, Question, UserAnswer } from "@/types/database";

function normalizePairs(pairs: DragPair[]): string {
  return [...pairs]
    .map((p) => `${p.left}:${p.right}`)
    .sort()
    .join("|");
}

export function isAnswerCorrect(question: Question, answer: UserAnswer): boolean {
  const correct = question.correct_answer;

  switch (question.type) {
    case "single":
      return answer === correct;
    case "multiple": {
      const userArr = Array.isArray(answer) ? [...answer].sort() : [];
      const correctArr = Array.isArray(correct) ? [...correct].sort() : [];
      return (
        userArr.length === correctArr.length &&
        userArr.every((v, i) => v === correctArr[i])
      );
    }
    case "drag": {
      const userPairs = Array.isArray(answer) ? (answer as DragPair[]) : [];
      const correctPairs = Array.isArray(correct) ? (correct as DragPair[]) : [];
      return normalizePairs(userPairs) === normalizePairs(correctPairs);
    }
    default:
      return false;
  }
}

export function scoreExam(
  questions: Question[],
  answers: Record<string, UserAnswer>
): { correctCount: number; score: number; passed: boolean } {
  let correctCount = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer !== undefined && isAnswerCorrect(q, answer)) {
      correctCount++;
    }
  }

  const score = questions.length > 0 ? correctCount / questions.length : 0;
  return {
    correctCount,
    score,
    passed: score >= PASS_THRESHOLD,
  };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
