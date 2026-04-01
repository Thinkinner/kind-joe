/**
 * Client-safe types + constants for prediction comments.
 * Do not import `db` or server-only modules here — use `comments.ts` on the server.
 */

export const PREDICTION_COMMENT_MAX_LENGTH = 4000;

export type PredictionCommentAuthorView = {
  id: string;
  name: string;
  image: string | null;
  username: string | null;
};

export type PredictionCommentNodeView = {
  id: number;
  authorId: string;
  author: PredictionCommentAuthorView;
  body: string;
  createdAt: string;
  /** Present on create response; tree from list omits on children (structure implies parent). */
  parentId?: number | null;
  replies: PredictionCommentNodeView[];
};
