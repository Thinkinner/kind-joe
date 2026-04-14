export const SOCIAL_COMMENT_MAX_LENGTH = 1500;

export type SocialCommentAuthorView = {
  id: string;
  name: string;
  image: string | null;
  username: string | null;
};

export type SocialCommentNodeView = {
  id: number;
  authorId: string;
  author: SocialCommentAuthorView;
  body: string;
  createdAt: string;
  parentId?: number | null;
  replies: SocialCommentNodeView[];
};
