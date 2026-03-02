import dailyArticles1 from '@/data/daily-articles.json';
import dailyArticles2 from '@/data/daily-articles-2.json';

export interface DailyArticle {
    id: string;
    day: number;
    age_range: string;
    icon: string;
    title: string;
    content: string;
    tip: string;
    source: string;
}

// Combine both article files
const allArticles: DailyArticle[] = [
    ...(dailyArticles1 as DailyArticle[]),
    ...(dailyArticles2 as DailyArticle[]),
];

/**
 * Get the age range key based on baby's age in months.
 * 5 categories: 0-6, 7-9, 10-12, 12-18, 18-23
 */
function getAgeRangeKey(ageMonths: number): string {
    if (ageMonths <= 6) return '0-6';
    if (ageMonths <= 9) return '7-9';
    if (ageMonths <= 12) return '10-12';
    if (ageMonths <= 18) return '12-18';
    return '18-23';
}

/**
 * Get today's daily article based on the child's age and a deterministic day cycle.
 * Articles are filtered by age range, then cycled by day count since user registration.
 */
export function getDailyArticle(ageMonths: number, userCreatedAt?: Date): DailyArticle | null {
    const ageRange = getAgeRangeKey(ageMonths);
    const articles = allArticles.filter(a => a.age_range === ageRange);

    if (articles.length === 0) return null;

    // Determine which article to show today
    const refDate = userCreatedAt || new Date('2026-01-01');
    const today = new Date();
    const diffMs = today.getTime() - refDate.getTime();
    const daysSinceRef = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const articleIndex = daysSinceRef % articles.length;

    return articles[articleIndex];
}

/**
 * Get all daily articles for an age range.
 */
export function getDailyArticlesForAge(ageMonths: number): DailyArticle[] {
    const ageRange = getAgeRangeKey(ageMonths);
    return allArticles.filter(a => a.age_range === ageRange);
}
