export const shortsPaths = {
  "/v1/api/shorts/data/{shortId}": {
    delete: {
      summary: "Delete a short",
      description: "Soft deletes a short by its ID. Only the creator of the short can delete it. The short will be marked as deleted and will not appear in any user queries.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "shortId",
          in: "path",
          required: true,
          description: "The unique identifier of the short to delete",
          schema: {
            type: "string",
            example: "60d0fe4f5311236168a109ca",
          },
        },
      ],
      responses: {
        "200": {
          description: "Short deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Short deleted successfully.",
                  },
                  data: {
                    type: "null",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Bad request - Invalid short ID format",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Not found",
                  },
                },
              },
            },
          },
        },
        "403": {
          description: "Forbidden - User is not the creator of the short",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Forbidden",
                  },
                },
              },
            },
          },
        },
        "404": {
          description: "Not found - Short doesn't exist or is already deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Not found",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - Authentication required",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Unauthorized",
                  },
                },
              },
            },
          },
        },
        "500": {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Internal server error",
                  },
                },
              },
            },
          },
        },
      },
    },
    get: {
      summary: "Get a short by ID",
      description: "Retrieves a single short by its ID with populated creator information and user interaction flags (isLiked, isViewed, isSaved, isFollowing). Deleted shorts will not be returned.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "shortId",
          in: "path",
          required: true,
          description: "The unique identifier of the short",
          schema: {
            type: "string",
            example: "60d0fe4f5311236168a109ca",
          },
        },
      ],
      responses: {
        "200": {
          description: "Short retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Fetched successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      _id: {
                        type: "string",
                        example: "60d0fe4f5311236168a109ca",
                      },
                      description: {
                        type: "string",
                        example: "This is a short video",
                      },
                      videoUrl: {
                        type: "string",
                        example: "https://example.com/video.mp4",
                      },
                      thumbnailUrl: {
                        type: "string",
                        example: "https://example.com/thumbnail.jpg",
                      },
                      duration: {
                        type: "number",
                        example: 30,
                      },
                      isLiked: {
                        type: "boolean",
                        example: false,
                      },
                      isViewed: {
                        type: "boolean",
                        example: false,
                      },
                      isSaved: {
                        type: "boolean",
                        example: false,
                      },
                      isFollowing: {
                        type: "boolean",
                        example: false,
                      },
                      creator: {
                        type: "object",
                        properties: {
                          _id: {
                            type: "string",
                          },
                          username: {
                            type: "string",
                          },
                          displayName: {
                            type: "string",
                          },
                          profilePicture: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "404": {
          description: "Short not found or deleted",
        },
      },
    },
  },
  "/v1/api/shorts/create": {
    post: {
      summary: "Create a new short",
      description: "Creates a new short video. Requires creator authentication.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["description", "thumbnailUrl", "duration", "tags"],
              properties: {
                description: {
                  type: "string",
                  example: "This is my short video",
                },
                videoUrl: {
                  type: "string",
                  format: "uri",
                  example: "https://example.com/video.mp4",
                },
                thumbnailUrl: {
                  type: "string",
                  format: "uri",
                  required: true,
                  example: "https://example.com/thumbnail.jpg",
                },
                duration: {
                  type: "number",
                  minimum: 0,
                  example: 30,
                },
                tags: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  example: ["funny", "viral"],
                },
                category: {
                  type: "string",
                  example: "entertainment",
                },
                visibility: {
                  type: "string",
                  enum: ["everyone", "subscribers", "paid"],
                  example: "everyone",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Short created successfully",
        },
        "400": {
          description: "Bad request - Invalid input",
        },
      },
    },
  },
  "/v1/api/shorts/filtered-data": {
    get: {
      summary: "Get filtered shorts",
      description: "Retrieves shorts with optional filters (creator, category, search). Supports pagination. Deleted shorts are automatically excluded.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "creatorId",
          in: "query",
          required: false,
          description: "Filter by creator ID",
          schema: {
            type: "string",
            example: "60d0fe4f5311236168a109ca",
          },
        },
        {
          name: "categoryName",
          in: "query",
          required: false,
          description: "Filter by category name",
          schema: {
            type: "string",
            example: "entertainment",
          },
        },
        {
          name: "search",
          in: "query",
          required: false,
          description: "Search in description",
          schema: {
            type: "string",
            example: "funny",
          },
        },
        {
          name: "page",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
            example: 1,
          },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
            example: 10,
          },
        },
      ],
      responses: {
        "200": {
          description: "Shorts retrieved successfully",
        },
      },
    },
  },
  "/v1/api/shorts/recommended": {
    get: {
      summary: "Get recommended shorts",
      description: "Retrieves personalized recommended shorts based on user preferences and behavior. Deleted shorts are automatically excluded.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
            example: 1,
          },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
            example: 10,
          },
        },
        {
          name: "algorithm",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["collaborative", "content-based", "hybrid"],
            default: "hybrid",
            example: "hybrid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Recommended shorts retrieved successfully",
        },
      },
    },
  },
  "/v1/api/shorts/trending": {
    get: {
      summary: "Get trending shorts",
      description: "Retrieves trending shorts based on views, likes, shares, and recency. Deleted shorts are automatically excluded.",
      tags: ["Shorts"],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            example: 1,
          },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            example: 10,
          },
        },
      ],
      responses: {
        "200": {
          description: "Trending shorts retrieved successfully",
        },
      },
    },
  },
};


