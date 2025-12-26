/**
 * Safely evaluates a math formula string.
 * @param {string} formula - e.g. "((gross_weight - less_weight) * rate)"
 * @param {object} values - e.g. { gross_weight: 10, less_weight: 1, rate: 5000 }
 */
export const evaluateFormula = (formula, values) => {
    if (!formula) return 0;
    let parsed = formula;
    
    // Replace variable names with values (e.g. {rate} or rate)
    Object.keys(values).forEach(key => {
        const val = parseFloat(values[key]) || 0;
        // Replace {key} format
        parsed = parsed.split(`{${key}}`).join(val);
        // Replace key format (ensure we don't replace substrings of other words)
        parsed = parsed.split(key).join(val);
    });

    try {
        // Security: Allow only numbers and math operators
        if (/[^0-9+\-*/().\s]/.test(parsed)) return 0;
        // eslint-disable-next-line no-new-func
        return new Function('return ' + parsed)();
    } catch (e) {
        return 0;
    }
};