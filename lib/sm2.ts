import type { Quality, SM2Result } from '@/types'

export function calculateSM2(
	quality: Quality,
	repetitions: number,
	intervalDays: number,
	easeFactor: number
): SM2Result {
	let newRepetitions = repetitions
	let newInterval = intervalDays
	let newEaseFactor = easeFactor

	if (quality < 3) {
		newRepetitions = 0
		newInterval = 1
	} else {
		newRepetitions += 1

		if (newRepetitions === 1) {
			newInterval = 1
		} else if (newRepetitions === 2) {
			newInterval = 6
		} else {
			newInterval = Math.round(newInterval * newEaseFactor)
		}
	}

	newEaseFactor =
		easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

	if (newEaseFactor < 1.3) {
		newEaseFactor = 1.3
	}

	const nextReview = new Date()
	nextReview.setDate(nextReview.getDate() + newInterval)

	return {
		repetitions: newRepetitions,
		interval_days: newInterval,
		ease_factor: newEaseFactor,
		next_review: nextReview,
	}
}

export const QUALITY_LABELS: Record<Quality, string> = {
	0: 'Again',
	1: 'Again',
	2: 'Hard',
	3: 'Good',
	4: 'Easy',
	5: 'Easy',
}
