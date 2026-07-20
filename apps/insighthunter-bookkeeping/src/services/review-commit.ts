export type ReviewCommitPayload = {
  sessionId: string;
  rowId: string;
  normalizedDescription?: string;
  normalizedAmount?: number;
  normalizedDate?: string;
  category?: string;
  confidence?: number;
};

export function buildReviewSql() {
  return `
    UPDATE import_rows
    SET normalized_description = ?, normalized_amount = ?, normalized_date = ?, category = ?, confidence = ?, review_status = ?, updated_at = datetime('now')
    WHERE id = ? AND session_id = ?
  `;
}

