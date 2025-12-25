/**
 * Safe Calculation Engine
 * @param {string} formula - e.g. "({weight} - {less}) * {rate}"
 * @param {object} values - e.g. { weight: 10, less: 0.5, rate: 5000 }
 */
export const calculateItemTotal = (formula, values) => {
    if (!formula) return 0;
    
    let parsedFormula = formula;
    
    // Replace variable placeholders {key} with actual values
    Object.keys(values).forEach(key => {
        // Ensure we handle numeric conversion safely
        const val = parseFloat(values[key]) || 0;
        // Global replace of {key}
        parsedFormula = parsedFormula.split(`{${key}}`).join(val);
    });

    try {
        // Sanitize: Allow only numbers, operators, and parenthesis
        // This prevents malicious code injection
        const safeChars = /^[0-9+\-*/().\s]*$/;
        if (!safeChars.test(parsedFormula)) {
            console.warn("Unsafe formula detected:", parsedFormula);
            return 0;
        }

        // Evaluate safely
        // eslint-disable-next-line no-new-func
        return new Function('return ' + parsedFormula)();
    } catch (e) {
        console.error("Calculation Error:", e);
        return 0;
    }
};