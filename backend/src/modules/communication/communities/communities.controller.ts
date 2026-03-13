import { Response } from "express";
import { Authenticate } from "../../../middleware/auth"; // Your custom JWT Request type
import {
  createCommunity,
  getHostelCommunities,
  joinCommunity,
  createPost,
  getCommunityFeed,
  getPostById,
  addComment,
  getPostComments,
  toggleVote,
  reportContent,
  moderatePost,
  moderateComment,
  voteOnPoll,
  joinLobby,
} from "./communities.service";

// ─── COMMUNITY MANAGEMENT ───

export const createCommunityController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { name, description, isPrivate } = req.body;
    const hostelId = req.user!.hostelId; // Extracted securely from JWT
    const creatorId = req.user!.userId;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "Name and description are required" });
    }

    const newClub = await createCommunity(
      hostelId,
      creatorId,
      name,
      description,
      isPrivate,
    );
    return res
      .status(201)
      .json({ message: "Community created successfully", community: newClub });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to create community" });
  }
};

export const getCommunitiesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const hostelId = req.user!.hostelId;
    const userId = req.user!.userId;

    const communities = await getHostelCommunities(hostelId, userId);
    return res.status(200).json(communities);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch communities" });
  }
};

export const joinCommunityController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params; // communityId
    const userId = req.user!.userId;

    const membership = await joinCommunity(userId, id);
    return res
      .status(200)
      .json({ message: "Successfully joined!", membership });
  } catch (error: any) {
    // Catch the "Community is private" error we wrote in the service
    if (error.message.includes("private")) {
      return res.status(403).json({ message: error.message });
    }
    return res
      .status(400)
      .json({ message: error.message || "Failed to join community" });
  }
};

// ─── POSTING & FEEDS ───

export const createPostController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params; // communityId
    const authorId = req.user!.userId;
    const {
      title,
      content,
      type,
      referenceId,
      lfgDetails,
      attachments,
      optionsForPoll,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Post title is required" });
    }

    // Optional: Add a check here to ensure the user is actually a member of the club before posting!

    const post = await createPost(
      id,
      authorId,
      title,
      content,
      type,
      referenceId,
      lfgDetails,
      attachments,
      optionsForPoll,
    );
    return res.status(201).json({ message: "Posted successfully", post });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to create post" });
  }
};

export const getFeedController = async (req: Authenticate, res: Response) => {
  try {
    const { id } = req.params; // communityId
    const userId = req.user!.userId;

    const feed = await getCommunityFeed(id, userId);
    return res.status(200).json(feed);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load feed" });
  }
};

export const getPostController = async (req: Authenticate, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.userId;
    const post = await getPostById(postId, userId);
    return res.status(200).json(post);
  } catch (error: any) {
    if (error.message === "Post not found") {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.status(500).json({ message: "Failed to load post" });
  }
};

export const joinLobbyController = async (req: Authenticate, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.userId;
    const result = await joinLobby(postId, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    if (
      error.message === "Lobby not found" ||
      error.message === "Lobby is full" ||
      error.message === "You have already joined this lobby" ||
      error.message === "Lobby is no longer active"
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to join lobby" });
  }
};

// ─── COMMENTS ───

export const addCommentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { postId } = req.params;
    const authorId = req.user!.userId;
    const { content, parentCommentId } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const comment = await addComment(
      postId,
      authorId,
      content,
      parentCommentId,
    );
    return res.status(201).json({ message: "Comment added", comment });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to add comment" });
  }
};

export const getCommentsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.userId;
    const comments = await getPostComments(postId, userId);
    return res.status(200).json(comments);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load comments" });
  }
};

// ─── VOTING ───

export const voteController = async (req: Authenticate, res: Response) => {
  try {
    const { targetId } = req.params;
    const { targetType, voteType } = req.body; // targetType: "POST" | "COMMENT"
    const userId = req.user!.userId; // 👈 We grab who is voting from the JWT

    if (voteType !== "UP" && voteType !== "DOWN") {
      return res.status(400).json({ message: "voteType must be UP or DOWN" });
    }
    if (targetType !== "POST" && targetType !== "COMMENT") {
      return res
        .status(400)
        .json({ message: "targetType must be POST or COMMENT" });
    }

    const result = await toggleVote(userId, targetType, targetId, voteType);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to register vote" });
  }
};

// ─── MODERATION ───

export const reportContentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const reporterId = req.user!.userId;
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res
        .status(400)
        .json({ message: "Missing required report fields" });
    }

    await reportContent(reporterId, targetType, targetId, reason);
    return res.status(201).json({
      message: "Report submitted successfully to the club moderators.",
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to submit report" });
  }
};

export const moderatePostController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { postId } = req.params;
    const { action } = req.body; // "LOCK" or "REMOVE"
    const moderatorId = req.user!.userId;

    if (action !== "LOCK" && action !== "REMOVE") {
      return res.status(400).json({ message: "Invalid moderation action" });
    }

    const updated = await moderatePost(postId, moderatorId, action);
    return res
      .status(200)
      .json({ message: `Post successfully ${action}ED`, post: updated });
  } catch (error: any) {
    return res.status(403).json({ message: error.message });
  }
};

export const moderateCommentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { commentId } = req.params;
    const moderatorId = req.user!.userId;

    const updated = await moderateComment(commentId, moderatorId);
    return res
      .status(200)
      .json({ message: "Comment removed successfully", comment: updated });
  } catch (error: any) {
    return res.status(403).json({ message: error.message });
  }
};

export const votePollController = async (req: Authenticate, res: Response) => {
  try {
    const { postId } = req.params;
    const { optionId } = req.body;
    const userId = req.user!.userId;

    if (!optionId) {
      return res.status(400).json({ message: "optionId is required to vote" });
    }

    const result = await voteOnPoll(postId, optionId, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to cast poll vote" });
  }
};
