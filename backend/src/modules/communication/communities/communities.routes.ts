import Router from "express";
import { authenticate } from "../../../middleware/auth";
import {
  createCommunityController,
  getCommunitiesController,
  joinCommunityController,
  createPostController,
  getFeedController,
  getCommentsController,
  addCommentController,
  getPostController,
  reportContentController,
  moderatePostController,
  moderateCommentController,
  voteController,
  votePollController,
  joinLobbyController,
} from "./communities.controller";

const router = Router();

// ─── COMMUNITIES (Clubs) ───
// GET /api/communities - List all clubs in my hostel
router.get("/", authenticate, getCommunitiesController);

// POST /api/communities - Create a new club (e.g., h/gaming)
router.post("/", authenticate, createCommunityController);

// POST /api/communities/:id/join - Join a specific club
router.post("/:id/join", authenticate, joinCommunityController);

// ─── POSTS (The Feed) ───
// GET /api/communities/:id/posts - Load the Reddit-style feed for a club
router.get("/:id/posts", authenticate, getFeedController);

// POST /api/communities/:id/posts - Create a new Discussion, Poll, or LFG post
router.post("/:id/posts", authenticate, createPostController);

// GET /api/communities/posts/:postId - Get a specific post details
router.get("/posts/:postId", authenticate, getPostController);

// GET /api/communities/posts/:postId/comments - Get the comment tree
router.get("/posts/:postId/comments", authenticate, getCommentsController);

// POST /api/communities/posts/:postId/comments - Add a comment (or reply)
router.post("/posts/:postId/comments", authenticate, addCommentController);

// Replace your old vote route with these two unified routes
router.patch("/posts/:targetId/vote", authenticate, voteController);
router.patch("/comments/:targetId/vote", authenticate, voteController);

// POST /api/communities/reports - Any user can report a post or comment
router.post("/reports", authenticate, reportContentController);

// PATCH /api/communities/posts/:postId/moderate - Club Admins only
router.patch("/posts/:postId/moderate", authenticate, moderatePostController);

// PATCH /api/communities/comments/:commentId/moderate - Club Admins only
router.patch(
  "/comments/:commentId/moderate",
  authenticate,
  moderateCommentController,
);

router.post("/posts/:postId/poll-vote", authenticate, votePollController);

// POST /api/communities/posts/:postId/lobby/join - Join a lobby
router.post("/posts/:postId/lobby/join", authenticate, joinLobbyController);

export default router;
