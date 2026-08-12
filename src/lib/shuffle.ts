// A seeded shuffle: the same seed always produces the same order, but
// different seeds produce different orders. This is what makes exam
// question/option shuffling work per student -- each student's shuffle
// is seeded with their own id, so it looks random but stays the same
// every time that student reloads the page, instead of re-shuffling
// (and confusing them) on every request.

// A simple seeded random number generator (linear congruential generator).
// Given the same seed, it always produces the same sequence of numbers.
function createSeededRandom(seed: number) {
    let value = seed;
    return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

// Turns a string (like "studentId-examId") into a number, so it can be
// used as a seed for the random number generator above.
function stringToSeed(text: string): number {
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
        seed = (seed * 31 + text.charCodeAt(i)) % 1000000007;
    }
    return seed;
}

// Fisher-Yates shuffle, using the seeded random number generator instead
// of Math.random() so the result is deterministic for a given seed.
export function seededShuffle<T>(items: T[], seed: string): T[] {
    const random = createSeededRandom(stringToSeed(seed));
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}
