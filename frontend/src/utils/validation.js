/**
 * Educational Firewall Validation Logic
 * Anchored to the Indian Education System standards.
 */

export const validateAcademicTimeline = (dob, educationHistory, newEntry) => {
    if (!dob) return "Please update your Date of Birth in the profile first.";
    
    const birthYear = new Date(dob).getFullYear();
    const passingYear = parseInt(newEntry.year);

    // Rule 1: Class 10 Passing Age (Strictly 16 or 17)
    // Based on joining Class 1 at age 6 + 10 years of schooling.
    if (newEntry.degree === "Class 10") {
        const age = passingYear - birthYear;
        if (age < 16 || age > 17) {
            return `Timeline Anomaly: At Class 10 graduation, your age was calculated as ${age}. 
                    Based on a Class 1 entry age of 6, you must be 16 or 17.`;
        }
    }

    // Rule 2: Sequential Logic (Class 12 must be exactly 2 years after Class 10)
    if (newEntry.degree === "Class 12") {
        const c10 = educationHistory.find(e => e.degree === "Class 10");
        if (c10) {
            const gap = passingYear - parseInt(c10.year);
            if (gap !== 2) {
                return "Timeline Anomaly: Class 12 must be completed exactly 2 years after Class 10.";
            }
        }
    }

    // Rule 3: Graduation Gap (Max 1 year gap after Class 12)
    const isUG = newEntry.degree.toLowerCase().includes("bachelor") || newEntry.degree === "Undergraduate";
    if (isUG) {
        const c12 = educationHistory.find(e => e.degree === "Class 12");
        if (c12) {
            // Standard UG is 3 or 4 years. We check the gap from the expected start.
            const expectedGradStart = parseInt(c12.year);
            const actualGradCompletion = passingYear;
            const yearsDiff = actualGradCompletion - expectedGradStart;

            // Allowing 3-4 years for degree + max 1 year gap
            if (yearsDiff < 3 || yearsDiff > 5) {
                return "Timeline Anomaly: The gap between High School and Graduation exceeds the 1-year allowance.";
            }
        }
    }

    return null; // Returns null if data is perfectly valid
};