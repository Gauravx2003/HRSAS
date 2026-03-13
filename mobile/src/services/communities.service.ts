import { api } from "./api";

export interface Post {
  id: string;
  title: string;
  content: string | null;
  type: "DISCUSSION" | "POLL" | "LFG" | "MARKETPLACE";
  upvotes: number;
  downvotes: number;
  comments: number;
  createdAt: string;
  author: { id: string; name: string; profilePic?: string };
  attachments?: { id: string; fileURL: string }[];
  status: "ACTIVE" | "LOCKED" | "REMOVED";
  lobby?: {
    id?: string;
    maxCapacity: number;
    currentJoined: number;
    eventTime: string | null;
    isJoined?: boolean;
    participants?: {
      id: string;
      name: string;
      profilePic: string | null;
      joinedAt: string;
    }[];
  };
  marketplaceItem?: {
    id: string;
    title: string;
    price: number;
    condition: string;
  };
  userVote: "UP" | "DOWN" | null;
  isReported: boolean;
  poll?: {
    options: { id: string; optionText: string; voteCount: number }[];
    userVotedOptionId: string | null;
  };
}

export interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; profilePic?: string };
  createdAt: string;
  parentCommentId: string | null;
  replies?: Comment[];
  upvotes: number;
  downvotes: number;
  userVote: "UP" | "DOWN" | null;
  isReported: boolean;
  isRemoved: boolean;
}

/**
 * Report inappropriate content in a community.
 *
 * @param targetType - either "POST" or "COMMENT"
 * @param targetId - the UUID of the post or comment
 * @param reason - reason for the report
 */
export const reportContent = async (
  targetType: "POST" | "COMMENT",
  targetId: string,
  reason: string,
) => {
  const response = await api.post("/communities/reports", {
    targetType,
    targetId,
    reason,
  });
  return response.data;
};

export const voteContent = async (
  targetType: "POST" | "COMMENT",
  targetId: string,
  voteType: "UP" | "DOWN",
) => {
  const endpoint =
    targetType === "POST"
      ? `/communities/posts/${targetId}/vote`
      : `/communities/comments/${targetId}/vote`;

  const response = await api.patch(endpoint, {
    targetType,
    voteType,
  });
  return response.data;
};

export const getCommunityFeed = async (id: string) => {
  const response = await api.get(`/communities/${id}/posts`);
  return response.data;
};

export const getPostById = async (postId: string) => {
  const response = await api.get(`/communities/posts/${postId}`);
  return response.data;
};

export const getCommentsByPostId = async (postId: string) => {
  const response = await api.get(`/communities/posts/${postId}/comments`);
  return response.data;
};

export const postComments = async (
  postId: string,
  content: string,
  parentCommentId: string | null,
) => {
  const response = await api.post(`/communities/posts/${postId}/comments`, {
    content,
    parentCommentId,
  });
  return response.data;
};

export const createPost = async (communityId: string, post: any) => {
  const response = await api.post(`/communities/${communityId}/posts`, post);
  return response.data;
};

export const moderatePost = async (
  postId: string,
  action: "LOCK" | "REMOVE",
) => {
  const response = await api.patch(`/communities/posts/${postId}/moderate`, {
    action,
  });
  return response.data;
};

export const moderateComment = async (commentId: string) => {
  const response = await api.patch(
    `/communities/comments/${commentId}/moderate`,
  );
  return response.data;
};

export const voteOnPoll = async (postId: string, optionId: string) => {
  const response = await api.post(`/communities/posts/${postId}/poll-vote`, {
    optionId,
  });
  return response.data;
};

export const joinLobby = async (postId: string) => {
  const response = await api.post(`/communities/posts/${postId}/lobby/join`);
  return response.data;
};
