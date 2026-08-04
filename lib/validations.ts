import { z } from "zod";
import { MAX_PHOTOS_PER_POST } from "@/lib/upload-limits";

/** 8-char guest access token (same format as presigned upload). */
export const accessTokenSchema = z.string().length(8);

/** 6-char uppercase alphanumeric personal invite code (from the guest CSV). */
export const inviteCodeSchema = z.string().length(6).regex(/^[A-Z0-9]+$/);

export const inviteLookupSchema = z.object({
  code: inviteCodeSchema,
});

export const inviteLoginSchema = z.object({
  invitationId: z.string().min(1),
  guestName: z.string().min(1).max(100),
});

export const hostAccessLoginSchema = z.object({
  secret: z.string().min(1).max(200),
});

/** 4–12 char uppercase alphanumeric event code (typed on home page). */
export const eventCodeSchema = z
  .string()
  .min(4)
  .max(12)
  .regex(/^[A-Z0-9]+$/);

export const accessModeSchema = z.enum([
  "INVITE_ONLY",
  "EVENT_CODE",
  "BOTH",
]);

export const invitationRowSchema = z.object({
  groupName: z.string().max(100).optional(),
  guestName: z.string().min(1).max(100),
  code: inviteCodeSchema,
});

export const createEventSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    eventDate: z.string().datetime().optional(),
    hostName: z.string().min(1).max(100),
    accessMode: accessModeSchema.default("INVITE_ONLY"),
    eventCode: eventCodeSchema.optional(),
    invitations: z.array(invitationRowSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const needsInvites =
      data.accessMode === "INVITE_ONLY" || data.accessMode === "BOTH";
    const needsEventCode =
      data.accessMode === "EVENT_CODE" || data.accessMode === "BOTH";

    if (needsInvites && (!data.invitations || data.invitations.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one guest invite is required for this access mode",
        path: ["invitations"],
      });
    }

    if (!needsInvites && data.invitations && data.invitations.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Guest invites are not allowed for event-code-only mode",
        path: ["invitations"],
      });
    }

    if (!needsEventCode && data.eventCode) {
      ctx.addIssue({
        code: "custom",
        message: "Event code is not allowed for invite-only mode",
        path: ["eventCode"],
      });
    }
  });

export const eventCodeLoginSchema = z.object({
  code: eventCodeSchema,
  guestName: z.string().min(1).max(100),
});

export const presignedUrlSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().regex(/^(image|video|audio)\//),
  token: z.string().length(8),
});

const postMediaItemSchema = z
  .object({
    objectKey: z.string().min(1),
    type: z.enum(["PHOTO", "VIDEO"]),
    takenAt: z.string().datetime().optional(),
    thumbnailObjectKey: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.objectKey) {
      const parts = data.objectKey.split("/");
      if (parts.length < 3 || parts[0] !== "events") {
        ctx.addIssue({
          code: "custom",
          message: "objectKey must belong to an event",
          path: ["objectKey"],
        });
      }
    }
  });

export const createPostSchema = z
  .object({
    token: accessTokenSchema,
    eventId: z.string().min(1),
    uploaderName: z.string().min(1).max(100),
    caption: z.string().max(500).optional(),
    momentId: z.string().min(1).optional(),
    promptId: z.string().min(1).optional(),
    idempotencyKey: z.string().uuid().optional(),
    items: z.array(postMediaItemSchema).min(1).max(MAX_PHOTOS_PER_POST),
  })
  .superRefine((data, ctx) => {
    for (const item of data.items) {
      const prefix = `events/${data.eventId}/`;
      if (!item.objectKey.startsWith(prefix)) {
        ctx.addIssue({
          code: "custom",
          message: "objectKey must belong to this event",
          path: ["items"],
        });
        break;
      }
    }
  });

export const recordMediaSchema = z
  .object({
    token: accessTokenSchema,
    objectKey: z.string().min(1).optional(),
    type: z.enum(["PHOTO", "VIDEO", "TEXT", "AUDIO"]),
    caption: z.string().max(500).optional(),
    uploaderName: z.string().min(1).max(100),
    eventId: z.string().min(1),
    takenAt: z.string().datetime().optional(),
    momentId: z.string().min(1).optional(),
    promptId: z.string().min(1).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "TEXT" && !data.objectKey) {
      ctx.addIssue({
        code: "custom",
        message: "objectKey is required for media uploads",
        path: ["objectKey"],
      });
    }
    if (data.type === "TEXT" && !data.caption?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "caption is required for text memories",
        path: ["caption"],
      });
    }
    if (data.objectKey && data.eventId) {
      const prefix = `events/${data.eventId}/`;
      if (!data.objectKey.startsWith(prefix)) {
        ctx.addIssue({
          code: "custom",
          message: "objectKey must belong to this event",
          path: ["objectKey"],
        });
      }
    }
  });

export const guestNameSchema = z.object({
  token: accessTokenSchema,
  name: z.string().min(1).max(100),
  eventId: z.string().min(1),
});

export const reactionSchema = z.object({
  token: accessTokenSchema,
  postId: z.string().min(1),
  emoji: z.enum(["❤️", "😂", "😮", "😢", "👏"]),
  guestName: z.string().min(1).max(100),
});

export const commentSchema = z.object({
  token: accessTokenSchema,
  postId: z.string().min(1),
  content: z.string().min(1).max(1000),
  authorName: z.string().min(1).max(100),
});

export const updatePostSchema = z.object({
  token: accessTokenSchema,
  uploaderName: z.string().min(1).max(100),
  caption: z.string().max(500).optional(),
  momentId: z.string().min(1).nullable().optional(),
});

export const deletePostSchema = z.object({
  token: accessTokenSchema,
  uploaderName: z.string().min(1).max(100),
});

export const updateCommentSchema = z.object({
  token: accessTokenSchema,
  authorName: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
});

export const deleteCommentSchema = z.object({
  token: accessTokenSchema,
  authorName: z.string().min(1).max(100),
});

export const tokenParamSchema = z.object({
  token: z.string().length(8),
});

export const momentSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const momentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const promptSchema = z.object({
  text: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const promptUpdateSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const adminAddInviteGuestSchema = z.object({
  guestNames: z.array(z.string().min(1).max(100)).min(1).max(50),
  groupName: z.string().max(100).optional(),
  code: inviteCodeSchema.optional(),
});

export const adminAddJoinedGuestSchema = z.object({
  name: z.string().min(1).max(100),
});

export type InvitationRowInput = z.infer<typeof invitationRowSchema>;
export type InviteLookupInput = z.infer<typeof inviteLookupSchema>;
export type InviteLoginInput = z.infer<typeof inviteLoginSchema>;
export type EventCodeLoginInput = z.infer<typeof eventCodeLoginSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type RecordMediaInput = z.infer<typeof recordMediaSchema>;
export type GuestNameInput = z.infer<typeof guestNameSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
