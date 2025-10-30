import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Instagram Profile Research Tool
 *
 * This tool uses authenticated access to Instagram to gather comprehensive
 * profile data for persona research. It requires either:
 * - A valid Instagram session cookie
 * - An OAuth access token from Instagram Graph API
 *
 * IMPORTANT: This tool accesses only profiles that:
 * - Are public, OR
 * - The authenticated user has permission to view
 *
 * Set INSTAGRAM_SESSION_ID in your .env file
 */

interface InstagramPost {
  id: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  imageUrl: string;
  hashtags: string[];
  location?: string;
}

interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  recentPosts: InstagramPost[];
  topHashtags: string[];
  interests: string[];
}

export const instagramProfileTool = createTool({
  id: "instagram-profile-research",
  description: `Research an Instagram profile to understand the person's interests, lifestyle, and social activity. 
    Use this when you need to gather comprehensive information about someone's Instagram presence.
    Only works for public profiles or profiles the authenticated user can access.`,
  inputSchema: z.object({
    username: z.string().describe("Instagram username (without @ symbol)"),
    maxPosts: z
      .number()
      .optional()
      .default(30)
      .describe("Maximum number of recent posts to analyze (default 30)"),
  }),
  outputSchema: z.object({
    profile: z.object({
      username: z.string(),
      fullName: z.string(),
      biography: z.string(),
      followerCount: z.number(),
      followingCount: z.number(),
      postCount: z.number(),
      isPrivate: z.boolean(),
      isVerified: z.boolean(),
    }),
    recentPosts: z.array(
      z.object({
        caption: z.string(),
        likes: z.number(),
        comments: z.number(),
        timestamp: z.string(),
        hashtags: z.array(z.string()),
        location: z.string().optional(),
      })
    ),
    insights: z.object({
      topHashtags: z.array(z.string()),
      interests: z.array(z.string()),
      postingFrequency: z.string(),
      engagementRate: z.number(),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { username, maxPosts = 30 } = context;

    // Get Instagram session from environment
    const sessionId = process.env.INSTAGRAM_SESSION_ID;

    if (!sessionId) {
      return {
        profile: {
          username,
          fullName: "",
          biography: "",
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isPrivate: false,
          isVerified: false,
        },
        recentPosts: [],
        insights: {
          topHashtags: [],
          interests: [],
          postingFrequency: "Unknown",
          engagementRate: 0,
        },
        error:
          "Instagram authentication not configured. Set INSTAGRAM_SESSION_ID in .env",
      };
    }

    try {
      // Using Instagram's unofficial API (used by the web interface)
      // Note: This is fragile and may break if Instagram changes their API
      const profileResponse = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            "X-IG-App-ID": "936619743392459", // Instagram web app ID
            Cookie: `sessionid=${sessionId}`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error(
          `Instagram API error: ${profileResponse.status} ${profileResponse.statusText}`
        );
      }

      const data = await profileResponse.json();
      const user = data.data.user;

      // Check if profile is private and we don't follow them
      if (user.is_private && !user.followed_by_viewer) {
        return {
          profile: {
            username: user.username,
            fullName: user.full_name,
            biography: user.biography,
            followerCount: user.edge_followed_by.count,
            followingCount: user.edge_follow.count,
            postCount: user.edge_owner_to_timeline_media.count,
            isPrivate: true,
            isVerified: user.is_verified,
          },
          recentPosts: [],
          insights: {
            topHashtags: [],
            interests: [],
            postingFrequency: "Unknown - Private account",
            engagementRate: 0,
          },
          error: "Profile is private and not followed by authenticated user",
        };
      }

      // Extract posts
      const posts: InstagramPost[] = user.edge_owner_to_timeline_media.edges
        .slice(0, maxPosts)
        .map((edge: any) => {
          const node = edge.node;
          const caption = node.edge_media_to_caption.edges[0]?.node.text || "";
          const hashtags =
            caption.match(/#\w+/g)?.map((tag: string) => tag.toLowerCase()) ||
            [];

          return {
            id: node.id,
            caption,
            likes: node.edge_liked_by.count,
            comments: node.edge_media_to_comment.count,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            imageUrl: node.display_url,
            hashtags,
            location: node.location?.name,
          };
        });

      // Analyze hashtags
      const hashtagCount: Record<string, number> = {};
      posts.forEach((post) => {
        post.hashtags.forEach((tag) => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });

      const topHashtags = Object.entries(hashtagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);

      // Infer interests from hashtags and captions
      const interests = inferInterests(posts, topHashtags);

      // Calculate posting frequency
      const postingFrequency = calculatePostingFrequency(posts);

      // Calculate engagement rate
      const totalEngagement = posts.reduce(
        (sum, post) => sum + post.likes + post.comments,
        0
      );
      const avgEngagement =
        posts.length > 0 ? totalEngagement / posts.length : 0;
      const engagementRate =
        user.edge_followed_by.count > 0
          ? (avgEngagement / user.edge_followed_by.count) * 100
          : 0;

      return {
        profile: {
          username: user.username,
          fullName: user.full_name,
          biography: user.biography,
          followerCount: user.edge_followed_by.count,
          followingCount: user.edge_follow.count,
          postCount: user.edge_owner_to_timeline_media.count,
          isPrivate: user.is_private,
          isVerified: user.is_verified,
        },
        recentPosts: posts.map((post) => ({
          caption: post.caption,
          likes: post.likes,
          comments: post.comments,
          timestamp: post.timestamp,
          hashtags: post.hashtags,
          location: post.location,
        })),
        insights: {
          topHashtags,
          interests,
          postingFrequency,
          engagementRate: Math.round(engagementRate * 100) / 100,
        },
      };
    } catch (error) {
      console.error("Error fetching Instagram profile:", error);
      return {
        profile: {
          username,
          fullName: "",
          biography: "",
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isPrivate: false,
          isVerified: false,
        },
        recentPosts: [],
        insights: {
          topHashtags: [],
          interests: [],
          postingFrequency: "Unknown",
          engagementRate: 0,
        },
        error: `Failed to fetch profile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Helper function to infer interests from content
function inferInterests(
  posts: InstagramPost[],
  topHashtags: string[]
): string[] {
  const interestKeywords: Record<string, string[]> = {
    Fitness: [
      "gym",
      "workout",
      "fitness",
      "training",
      "health",
      "bodybuilding",
    ],
    Travel: ["travel", "vacation", "adventure", "explore", "wanderlust"],
    Food: ["food", "foodie", "cooking", "restaurant", "chef", "recipe"],
    Fashion: ["fashion", "style", "ootd", "outfit", "shopping"],
    Photography: ["photography", "photo", "camera", "photographer"],
    Nature: ["nature", "outdoor", "hiking", "camping", "wilderness"],
    Technology: ["tech", "technology", "coding", "developer", "startup"],
    Art: ["art", "artist", "creative", "design", "drawing"],
    Music: ["music", "musician", "concert", "song", "band"],
    Sports: ["sports", "football", "basketball", "soccer", "athlete"],
  };

  const interests: Set<string> = new Set();

  // Check hashtags
  topHashtags.forEach((tag) => {
    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some((keyword) => tag.includes(keyword))) {
        interests.add(interest);
      }
    }
  });

  // Check captions
  const allText = posts.map((p) => p.caption.toLowerCase()).join(" ");
  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some((keyword) => allText.includes(keyword))) {
      interests.add(interest);
    }
  }

  return Array.from(interests);
}

// Helper function to calculate posting frequency
function calculatePostingFrequency(posts: InstagramPost[]): string {
  if (posts.length < 2) return "Insufficient data";

  const timestamps = posts.map((p) => new Date(p.timestamp).getTime());
  const sortedTimestamps = timestamps.sort((a, b) => b - a);

  const daysDiff =
    (sortedTimestamps[0] - sortedTimestamps[sortedTimestamps.length - 1]) /
    (1000 * 60 * 60 * 24);
  const postsPerDay = posts.length / daysDiff;

  if (postsPerDay >= 1) return `${Math.round(postsPerDay)} posts per day`;
  if (postsPerDay >= 0.14)
    return `${Math.round(postsPerDay * 7)} posts per week`;
  return `${Math.round(postsPerDay * 30)} posts per month`;
}
