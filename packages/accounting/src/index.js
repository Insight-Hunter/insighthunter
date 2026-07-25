/** Round to the nearest cent before comparing to avoid floating-point drift. */
function toCents(amount) {
    return Math.round(amount * 100);
}
export function isBalanced(entry) {
    const debit = entry.lines.reduce((sum, line) => sum + toCents(line.debit), 0);
    const credit = entry.lines.reduce((sum, line) => sum + toCents(line.credit), 0);
    return debit === credit;
}
//# sourceMappingURL=index.js.map