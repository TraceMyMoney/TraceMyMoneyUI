// Amount fields only take a positive number: the Debit / Credit chip decides the sign.
// Used by the Add Expense drawer and the inline "Add Entry" cards.

/** Drops any minus sign (typed or pasted) from an amount string. */
export const cleanAmount = (v) => String(v).replace(/-/g, "");

/** onKeyDown for a number input: refuse "-" and "e" so nothing negative can be typed. */
export function blockNegativeKey(e) {
  if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
}
