'use client';

import { useMemo } from 'react';
import { calculateBabyAge, BabyAge } from '@/lib/age-calculator';
import { useAuth } from '@/hooks/useAuth';

export function useBabyAge(): BabyAge | null {
    const { activeChild } = useAuth();

    const age = useMemo(() => {
        if (!activeChild?.dob) return null;
        return calculateBabyAge(new Date(activeChild.dob));
    }, [activeChild?.dob]);

    return age;
}

/**
 * Hook to get unique age categories for all of the user's children (baduta only).
 * Returns categories for both the Education tab and the Daily Reading (Bacaan) tab.
 */
export function useChildrenAgeCategories() {
    const { profile } = useAuth();

    return useMemo(() => {
        const eduCategories = new Set<string>();
        const bacaanCategories = new Set<string>();

        if (!profile?.children || profile.children.length === 0) {
            return { eduCategories: [], bacaanCategories: [] };
        }

        profile.children.forEach(child => {
            const age = calculateBabyAge(new Date(child.dob));

            // Only process baduta (0-23 months)
            if (age.months <= 23) {
                // Edukasi mapping (0-5, 6-8, 9-11, 12-23)
                if (age.months <= 5) eduCategories.add('0-5');
                else if (age.months <= 8) eduCategories.add('6-8');
                else if (age.months <= 11) eduCategories.add('9-11');
                else eduCategories.add('12-23');

                // Bacaan mapping (0-6, 7-9, 10-12, 12-18, 18-23)
                if (age.months <= 6) bacaanCategories.add('0-6');
                else if (age.months <= 9) bacaanCategories.add('7-9');
                else if (age.months <= 12) bacaanCategories.add('10-12');
                else if (age.months <= 18) bacaanCategories.add('12-18');
                else bacaanCategories.add('18-23');
            }
        });

        // Sort them just to be safe (lexicographical sort works okay for these specific strings)
        return {
            eduCategories: Array.from(eduCategories).sort(),
            bacaanCategories: Array.from(bacaanCategories).sort(),
        };
    }, [profile?.children]);
}
