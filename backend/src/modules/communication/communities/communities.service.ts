import { db } from "../../../db";
import {
  communities,
  communityMembers,
  posts,
  users,
  postLobbies,
  lobbyParticipants,
  comments,
  marketplaceItems,
  reports,
  postAttachments,
  votes,
  pollOptions,
  pollVotes,
} from "../../../db/schema";
import { eq, and, desc, asc, sql, count, or } from "drizzle-orm";

// ─── 1. COMMUNITY MANAGEMENT ───

export const createCommunity = async (
  hostelId: string,
  creatorId: string,
  name: string,
  description: string,
  isPrivate: boolean = false,
) => {
  // We use a transaction so if the member assignment fails, the club isn't created.
  return await db.transaction(async (tx) => {
    // 1. Create the community
    const [newCommunity] = await tx
      .insert(communities)
      .values({
        hostelId,
        name: name.toLowerCase().replace(/\s+/g, "-"), // Formats "Music Club" to "music-club"
        description,
        isPrivate,
      })
      .returning();

    // 2. Automatically make the creator an ADMIN of this new club
    await tx.insert(communityMembers).values({
      userId: creatorId,
      communityId: newCommunity.id,
      role: "ADMIN",
    });

    return newCommunity;
  });
};

export const getHostelCommunities = async (
  hostelId: string,
  userId: string,
) => {
  // Fetches all communities in the hostel AND checks if the current user is a member
  const memberAlias = db.$with("user_membership").as(
    db
      .select({
        communityId: communityMembers.communityId,
        role: communityMembers.role,
      })
      .from(communityMembers)
      .where(eq(communityMembers.userId, userId)),
  );

  return await db
    .with(memberAlias)
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      isPrivate: communities.isPrivate,
      memberCount: sql<number>`(SELECT COUNT(*) FROM ${communityMembers} WHERE ${communityMembers.communityId} = ${communities.id})`,
      isJoined: sql<boolean>`CASE WHEN user_membership.community_id IS NOT NULL THEN true ELSE false END`,
      role: sql<string | null>`user_membership.role`,
    })
    .from(communities)
    .leftJoin(
      memberAlias,
      eq(communities.id, sql`user_membership.community_id`),
    )
    .where(eq(communities.hostelId, hostelId))
    .orderBy(desc(communities.createdAt));
};

export const joinCommunity = async (userId: string, communityId: string) => {
  // Check if it's private first
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId));

  if (!community) throw new Error("Community not found");
  if (community.isPrivate) {
    throw new Error("This community is private. You must request access."); // You can build a request flow later!
  }

  const [membership] = await db
    .insert(communityMembers)
    .values({
      userId,
      communityId,
      role: "MEMBER",
    })
    .onConflictDoNothing() // Prevents crash if they click join twice
    .returning();

  return membership;
};

// ─── 2. POSTING & FEEDS ───

export const createPost = async (
  communityId: string,
  authorId: string,
  title: string,
  content: string,
  type: "DISCUSSION" | "POLL" | "LFG" | "MARKETPLACE" = "DISCUSSION",
  referenceId?: string,
  lfgDetails?: { maxCapacity: number; eventTime: Date }, // Only used if type === "LFG"
  attachments?: { fileURL: string; publicId: string }[], // 👈 NEW PARAMETER
  optionsForPoll?: string[], // 👈 NEW PARAMETER
) => {
  return await db.transaction(async (tx) => {
    // 1. Create the main post
    const [newPost] = await tx
      .insert(posts)
      .values({
        communityId,
        authorId,
        title,
        content,
        type,
        referenceId,
      })
      .returning();

    // 2. 🚨 NEW: Insert Attachments if they exist
    if (attachments && attachments.length > 0) {
      const attachmentValues = attachments.map((img) => ({
        postId: newPost.id,
        uploadedBy: authorId,
        fileURL: img.fileURL,
        publicId: img.publicId,
      }));
      await tx.insert(postAttachments).values(attachmentValues);
    }

    // 2. 🚨 THE LFG MAGIC 🚨 If it's a gaming/sports lobby, create the lobby metadata
    if (type === "LFG" && lfgDetails) {
      const [lobby] = await tx
        .insert(postLobbies)
        .values({
          postId: newPost.id,
          maxCapacity: lfgDetails.maxCapacity,
          eventTime: lfgDetails.eventTime,
        })
        .returning();

      // Auto-join the creator to their own lobby
      await tx.insert(lobbyParticipants).values({
        lobbyId: lobby.id,
        userId: authorId,
      });
    }

    // 🚨 NEW: THE POLL MAGIC 🚨
    if (type === "POLL" && optionsForPoll && optionsForPoll.length > 0) {
      const pollValues = optionsForPoll.map((opt) => ({
        postId: newPost.id,
        optionText: opt,
      }));
      await tx.insert(pollOptions).values(pollValues);
    }

    return newPost;
  });
};

export const getCommunityFeed = async (communityId: string, userId: string) => {
  const feedPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      type: posts.type,
      upvotes: posts.upvotes,
      comments: posts.comments,
      createdAt: posts.createdAt,
      referenceId: posts.referenceId,
      author: {
        id: users.id,
        name: users.name,
        profilePic: users.profilePicUrl,
      },
      // If it's an LFG post, this populates:
      lobby: {
        id: postLobbies.id,
        maxCapacity: postLobbies.maxCapacity,
        currentJoined: postLobbies.currentJoined,
        eventTime: postLobbies.eventTime,
        isJoined: sql<boolean>`CASE WHEN ${lobbyParticipants.userId} IS NOT NULL THEN true ELSE false END`,
      },
      // 🚨 THE NEW MARKETPLACE INTEGRATION 🚨
      // If type === 'MARKETPLACE', this automatically populates!
      marketplaceItem: {
        id: marketplaceItems.id,
        title: marketplaceItems.title,
        price: marketplaceItems.price,
        condition: marketplaceItems.condition,
        status: marketplaceItems.status,
      },
      userVote: votes.type,
      isReported: sql<boolean>`CASE WHEN ${reports.id} IS NOT NULL THEN true ELSE false END`,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(postLobbies, eq(posts.id, postLobbies.postId))
    .leftJoin(
      lobbyParticipants,
      and(
        eq(lobbyParticipants.lobbyId, postLobbies.id),
        eq(lobbyParticipants.userId, userId),
      ),
    )
    // 👈 The magic join for cross-posted items
    .leftJoin(marketplaceItems, eq(posts.referenceId, marketplaceItems.id))
    .leftJoin(
      votes,
      and(
        eq(votes.targetId, posts.id),
        eq(votes.targetType, "POST"),
        eq(votes.userId, userId),
      ),
    )
    // 👈 Magic Join 2: The user's report on this specific post
    .leftJoin(
      reports,
      and(
        eq(reports.targetId, posts.id),
        eq(reports.targetType, "POST"),
        eq(reports.reportedBy, userId),
      ),
    )
    .where(
      and(
        eq(posts.communityId, communityId),
        or(eq(posts.status, "ACTIVE"), eq(posts.status, "LOCKED")),
      ),
    )
    .orderBy(desc(posts.createdAt));

  // 2. 🚨 NEW: Fetch attachments for all these posts efficiently
  // We map over the posts and fetch their images to attach to the final JSON
  const feedWithExtras = await Promise.all(
    feedPosts.map(async (post) => {
      // Fetch Images
      const images = await db
        .select({ id: postAttachments.id, fileURL: postAttachments.fileURL })
        .from(postAttachments)
        .where(eq(postAttachments.postId, post.id));

      let pollData = null;

      // 🚨 NEW: Fetch Poll Tallies and User's Choice
      if (post.type === "POLL") {
        const options = await db
          .select({
            id: pollOptions.id,
            optionText: pollOptions.optionText,
            // Calculate votes on the fly
            voteCount: sql<number>`(SELECT COUNT(*) FROM ${pollVotes} WHERE ${pollVotes.optionId} = ${pollOptions.id})`,
          })
          .from(pollOptions)
          .where(eq(pollOptions.postId, post.id));

        // Did the current user vote in this poll?
        const [userVote] = await db
          .select({ optionId: pollVotes.optionId })
          .from(pollVotes)
          .where(
            and(eq(pollVotes.postId, post.id), eq(pollVotes.userId, userId)),
          );

        pollData = {
          options,
          userVotedOptionId: userVote?.optionId || null, // Tells UI which button to highlight
        };
      }

      return {
        ...post,
        attachments: images,
        poll: pollData, // Attach it to the response!
      };
    }),
  );

  return feedWithExtras;
};

export const voteOnPoll = async (
  postId: string,
  optionId: string,
  userId: string,
) => {
  return await db.transaction(async (tx) => {
    // Because we use a Composite Primary Key (postId + userId),
    // a user can only have one row per poll. If they vote again, we update it.

    const [existingVote] = await tx
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)));

    if (existingVote) {
      // They changed their mind! Switch the vote to the new option.
      const [updated] = await tx
        .update(pollVotes)
        .set({ optionId })
        .where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)))
        .returning();
      return { message: "Poll vote updated", vote: updated };
    } else {
      // First time voting
      const [newVote] = await tx
        .insert(pollVotes)
        .values({ postId, optionId, userId })
        .returning();
      return { message: "Poll vote cast", vote: newVote };
    }
  });
};

export const getPostById = async (postId: string, userId: string) => {
  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      type: posts.type,
      upvotes: posts.upvotes,
      comments: posts.comments,
      createdAt: posts.createdAt,
      referenceId: posts.referenceId,
      status: posts.status,
      author: {
        id: users.id,
        name: users.name,
        profilePic: users.profilePicUrl,
      },
      lobby: {
        id: postLobbies.id,
        maxCapacity: postLobbies.maxCapacity,
        currentJoined: postLobbies.currentJoined,
        eventTime: postLobbies.eventTime,
        isJoined: sql<boolean>`CASE WHEN ${lobbyParticipants.userId} IS NOT NULL THEN true ELSE false END`,
      },
      marketplaceItem: {
        id: marketplaceItems.id,
        title: marketplaceItems.title,
        price: marketplaceItems.price,
        condition: marketplaceItems.condition,
        status: marketplaceItems.status,
      },
      userVote: votes.type,
      isReported: sql<boolean>`CASE WHEN ${reports.id} IS NOT NULL THEN true ELSE false END`,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(postLobbies, eq(posts.id, postLobbies.postId))
    .leftJoin(
      lobbyParticipants,
      and(
        eq(lobbyParticipants.lobbyId, postLobbies.id),
        eq(lobbyParticipants.userId, userId),
      ),
    )
    .leftJoin(marketplaceItems, eq(posts.referenceId, marketplaceItems.id))
    .leftJoin(
      votes,
      and(
        eq(votes.targetId, posts.id),
        eq(votes.targetType, "POST"),
        eq(votes.userId, userId),
      ),
    )
    .leftJoin(
      reports,
      and(
        eq(reports.targetId, posts.id),
        eq(reports.targetType, "POST"),
        eq(reports.reportedBy, userId),
      ),
    )
    .where(
      and(
        eq(posts.id, postId),
        or(eq(posts.status, "ACTIVE"), eq(posts.status, "LOCKED")),
      ),
    );

  if (!post) {
    throw new Error("Post not found");
  }

  const images = await db
    .select({
      id: postAttachments.id,
      fileURL: postAttachments.fileURL,
    })
    .from(postAttachments)
    .where(eq(postAttachments.postId, post.id));

  // If it's an LFG post and the current user is the author, fetch the participants
  let participants: any[] = [];
  if (post.type === "LFG" && post.lobby && post.author.id === userId) {
    participants = await db
      .select({
        id: users.id,
        name: users.name,
        profilePic: users.profilePicUrl,
        joinedAt: lobbyParticipants.joinedAt,
      })
      .from(lobbyParticipants)
      .innerJoin(users, eq(lobbyParticipants.userId, users.id))
      .where(eq(lobbyParticipants.lobbyId, post.lobby.id))
      .orderBy(asc(lobbyParticipants.joinedAt));
  }

  return {
    ...post,
    attachments: images,
    ...(post.type === "LFG" && post.lobby && post.author.id === userId
      ? { lobby: { ...post.lobby, participants } }
      : {}),
  };
};

export const joinLobby = async (postId: string, userId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Find the lobby
    const [lobby] = await tx
      .select()
      .from(postLobbies)
      .where(eq(postLobbies.postId, postId));

    if (!lobby) throw new Error("Lobby not found");
    if (!lobby.isActive) throw new Error("Lobby is no longer active");

    // 2. Check capacity
    if (lobby.currentJoined && lobby.currentJoined >= lobby.maxCapacity) {
      throw new Error("Lobby is full");
    }

    // 3. Check if they already joined
    const [existing] = await tx
      .select()
      .from(lobbyParticipants)
      .where(
        and(
          eq(lobbyParticipants.lobbyId, lobby.id),
          eq(lobbyParticipants.userId, userId),
        ),
      );

    if (existing) {
      throw new Error("You have already joined this lobby");
    }

    // 4. Insert participant and update count
    await tx.insert(lobbyParticipants).values({
      lobbyId: lobby.id,
      userId,
    });

    await tx
      .update(postLobbies)
      .set({ currentJoined: sql`${postLobbies.currentJoined} + 1` })
      .where(eq(postLobbies.id, lobby.id));

    return { message: "Joined lobby successfully" };
  });
};

// ─── 3. COMMENTS & THREADS ───

export const addComment = async (
  postId: string,
  authorId: string,
  content: string,
  parentCommentId?: string, // Optional: If provided, it's a reply to a comment!
) => {
  // 1. Verify the post exists and is ACTIVE
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post) throw new Error("Post not found");
  if (post.status === "LOCKED")
    throw new Error("Comments are locked for this post");

  // 2. Insert the comment
  return db.transaction(async (tx) => {
    const [newComment] = await tx
      .insert(comments)
      .values({
        postId,
        authorId,
        content,
        parentCommentId: parentCommentId || null,
      })
      .returning();

    await tx
      .update(posts)
      .set({ comments: sql`${posts.comments} + 1` })
      .where(eq(posts.id, post.id));

    return newComment;
  });
};

export const getPostComments = async (postId: string, userId: string) => {
  // Fetches all comments for a post, joining the author's details.
  // We sort by oldest first, which is standard for building comment trees.
  return await db
    .select({
      id: comments.id,
      parentCommentId: comments.parentCommentId, // 👈 The magic key for nested UI
      content: comments.content,
      upvotes: comments.upvotes,
      isRemoved: comments.isRemoved,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        profilePic: users.profilePicUrl,
      },
      userVote: votes.type,
      isReported: sql<boolean>`CASE WHEN ${reports.id} IS NOT NULL THEN true ELSE false END`,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .leftJoin(
      votes,
      and(
        eq(votes.targetId, comments.id),
        eq(votes.targetType, "COMMENT"),
        eq(votes.userId, userId),
      ),
    )
    .leftJoin(
      reports,
      and(
        eq(reports.targetId, comments.id),
        eq(reports.targetType, "COMMENT"),
        eq(reports.reportedBy, userId),
      ),
    )
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));
};

// ─── 4. UPVOTING ───

export const toggleVote = async (
  userId: string,
  targetType: "POST" | "COMMENT",
  targetId: string,
  voteType: "UP" | "DOWN",
) => {
  return await db.transaction(async (tx) => {
    // 1. Check if the user already voted on this specific item
    const [existingVote] = await tx
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetType, targetType),
          eq(votes.targetId, targetId),
        ),
      );

    if (existingVote) {
      if (existingVote.type === voteType) {
        // SCENARIO A: They clicked the same button again -> REMOVE VOTE
        await tx.delete(votes).where(eq(votes.id, existingVote.id));

        if (targetType === "POST") {
          await tx
            .update(posts)
            .set({
              [voteType === "UP" ? "upvotes" : "downvotes"]:
                sql`${voteType === "UP" ? posts.upvotes : posts.downvotes} - 1`,
            })
            .where(eq(posts.id, targetId));
        } else {
          await tx
            .update(comments)
            .set({
              [voteType === "UP" ? "upvotes" : "downvotes"]:
                sql`${voteType === "UP" ? comments.upvotes : comments.downvotes} - 1`,
            })
            .where(eq(comments.id, targetId));
        }
        return { message: "Vote removed" };
      } else {
        // SCENARIO B: They changed their mind (e.g., UP to DOWN) -> SWAP VOTE
        await tx
          .update(votes)
          .set({ type: voteType })
          .where(eq(votes.id, existingVote.id));

        if (targetType === "POST") {
          await tx
            .update(posts)
            .set({
              [voteType === "UP" ? "upvotes" : "downvotes"]:
                sql`${voteType === "UP" ? posts.upvotes : posts.downvotes} + 1`,
              [voteType === "UP" ? "downvotes" : "upvotes"]:
                sql`${voteType === "UP" ? posts.downvotes : posts.upvotes} - 1`,
            })
            .where(eq(posts.id, targetId));
        } else {
          await tx
            .update(comments)
            .set({
              [voteType === "UP" ? "upvotes" : "downvotes"]:
                sql`${voteType === "UP" ? comments.upvotes : comments.downvotes} + 1`,
              [voteType === "UP" ? "downvotes" : "upvotes"]:
                sql`${voteType === "UP" ? comments.downvotes : comments.upvotes} - 1`,
            })
            .where(eq(comments.id, targetId));
        }
        return { message: `Vote changed to ${voteType}` };
      }
    } else {
      // SCENARIO C: First time voting -> ADD VOTE
      await tx
        .insert(votes)
        .values({ userId, targetType, targetId, type: voteType });

      if (targetType === "POST") {
        await tx
          .update(posts)
          .set({
            [voteType === "UP" ? "upvotes" : "downvotes"]:
              sql`${voteType === "UP" ? posts.upvotes : posts.downvotes} + 1`,
          })
          .where(eq(posts.id, targetId));
      } else {
        await tx
          .update(comments)
          .set({
            [voteType === "UP" ? "upvotes" : "downvotes"]:
              sql`${voteType === "UP" ? comments.upvotes : comments.downvotes} + 1`,
          })
          .where(eq(comments.id, targetId));
      }
      return { message: `Voted ${voteType}` };
    }
  });
};

// ─── 5. MODERATION & REPORTS ───

export const reportContent = async (
  reportedBy: string,
  targetType: "POST" | "COMMENT",
  targetId: string,
  reason: string,
) => {
  // 1. Check if this user has ALREADY reported this specific item
  const [existingReport] = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.reportedBy, reportedBy),
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
      ),
    );

  if (existingReport) {
    throw new Error("You have already reported this content."); // Blocks spam!
  }

  // 2. Insert if clean
  const [newReport] = await db
    .insert(reports)
    .values({ reportedBy, targetType, targetId, reason })
    .returning();

  return newReport;
};

export const moderatePost = async (
  postId: string,
  moderatorId: string,
  action: "LOCK" | "REMOVE",
) => {
  // 1. Fetch the post to find out which community it belongs to
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post) throw new Error("Post not found");

  // 2. SECURITY CHECK: Is this user a Mod or Admin of THIS specific community?
  const [membership] = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, post.communityId),
        eq(communityMembers.userId, moderatorId),
      ),
    );

  if (
    !membership ||
    (membership.role !== "MODERATOR" && membership.role !== "ADMIN")
  ) {
    throw new Error("Access Denied: You are not a moderator of this community");
  }

  // 3. Apply the moderation action
  const [updatedPost] = await db
    .update(posts)
    .set({
      status: action === "LOCK" ? "LOCKED" : "REMOVED",
    })
    .where(eq(posts.id, postId))
    .returning();

  // 4. (Optional) Auto-resolve related reports for this post
  await db
    .update(reports)
    .set({ isResolved: true })
    .where(and(eq(reports.targetId, postId), eq(reports.targetType, "POST")));

  return updatedPost;
};

export const moderateComment = async (
  commentId: string,
  moderatorId: string,
) => {
  // 1. We have to join with posts to find the communityId
  const [commentData] = await db
    .select({
      communityId: posts.communityId,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, commentId));

  if (!commentData) throw new Error("Comment not found");

  // 2. SECURITY CHECK
  const [membership] = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, commentData.communityId),
        eq(communityMembers.userId, moderatorId),
      ),
    );

  if (
    !membership ||
    (membership.role !== "MODERATOR" && membership.role !== "ADMIN")
  ) {
    throw new Error("Access Denied: You are not a moderator of this community");
  }

  // 3. "Soft Delete" the comment (keeps the thread intact, just hides the text)
  const [updatedComment] = await db
    .update(comments)
    .set({
      isRemoved: true,
      content: "[Removed by Moderator]", // Overwrite the toxic content immediately
    })
    .where(eq(comments.id, commentId))
    .returning();

  return updatedComment;
};
