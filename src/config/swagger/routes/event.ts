export const eventPaths = {
  "/v1/api/events/create": {
    post: {
      summary: "Create a new event",
      description: "Creates a new event with associated tickets. Only creators can create events.",
      tags: ["Events"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "eventCoverImageUrl",
                "eventName",
                "eventDateTime",
                "eventPublishOnDate",
                "eventDescription",
                "eventLocation",
                "eventCategory",
                "tickets",
              ],
              properties: {
                eventCoverImageUrl: {
                  type: "string",
                  format: "uri",
                  example: "https://example.com/images/event-cover.jpg",
                },
                eventName: {
                  type: "string",
                  example: "Summer Music Festival 2025",
                },
                eventDateTime: {
                  type: "string",
                  format: "date-time",
                  example: "2025-07-15T18:00:00Z",
                },
                eventPublishOnDate: {
                  type: "string",
                  format: "date-time",
                  example: "2025-06-01T10:00:00Z",
                },
                eventDescription: {
                  type: "string",
                  example: "Join us for an amazing summer music festival featuring top artists.",
                },
                eventLocation: {
                  type: "object",
                  properties: {
                    coordinates: {
                      type: "object",
                      properties: {
                        lat: { type: "number", example: 40.7128 },
                        lng: { type: "number", example: -74.006 },
                      },
                    },
                    zipCode: { type: "number", example: 10001 },
                    address: { type: "string", example: "123 Main St, New York, NY" },
                  },
                },
                eventCategory: { type: "string", example: "Music" },
                eventArenaImageUrl: {
                  type: "string",
                  format: "uri",
                  example: "https://example.com/images/arena.jpg",
                },
                eventCurrencyType: { type: "string", example: "USD" },
                eventLimitPerUser: { type: "number", example: 5 },
                tickets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ticketName: { type: "string", example: "VIP Pass" },
                      originalPrice: { type: "number", example: 150 },
                      numberOfTickets: { type: "number", example: 100 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Event created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Event created successfully" },
                  data: {
                    type: "object",
                    properties: {
                      event: { $ref: "#/components/schemas/Event" },
                      tickets: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EventTicket" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Bad request - validation error or missing tickets",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "403": {
          description: "Forbidden - user is not a creator",
        },
      },
    },
  },
  "/v1/api/events": {
    get: {
      summary: "Get all events",
      description: "Retrieves a list of all events with optional filters and pagination.",
      tags: ["Events"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by event name or description",
        },
        {
          name: "category",
          in: "query",
          schema: { type: "string" },
          description: "Filter by event category",
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["scheduled", "cancelled", "postponed"] },
          description: "Filter by event status",
        },
        {
          name: "timeFilter",
          in: "query",
          schema: { type: "string", enum: ["live", "upcoming", "past"] },
          description: "Filter by event timing - 'live' (published & not started yet), 'upcoming' (will publish in next 30 days), 'past' (already happened)",
        },
        {
          name: "page",
          in: "query",
          schema: { type: "number", default: 1 },
          description: "Page number for pagination",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "number", default: 10, maximum: 50 },
          description: "Number of items per page",
        },
      ],
      responses: {
        "200": {
          description: "Events fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Events fetched successfully" },
                  data: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Event" },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          total: { type: "number" },
                          page: { type: "number" },
                          limit: { type: "number" },
                          totalPages: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
      },
    },
  },
  "/v1/api/events/{eventId}": {
    get: {
      summary: "Get event by ID",
      description: "Retrieves a specific event by its ID along with associated tickets.",
      tags: ["Events"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "eventId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the event",
        },
      ],
      responses: {
        "200": {
          description: "Event fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Event fetched successfully" },
                  data: {
                    type: "object",
                    properties: {
                      event: { $ref: "#/components/schemas/Event" },
                      tickets: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EventTicket" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid event ID",
        },
        "404": {
          description: "Event not found",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
      },
    },
    put: {
      summary: "Update event",
      description:
        "Updates an event. Only the event creator can update. If eventDateTime is changed, status automatically updates to 'postponed'.",
      tags: ["Events"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "eventId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the event",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                eventCoverImageUrl: { type: "string", format: "uri" },
                eventName: { type: "string" },
                eventDateTime: { type: "string", format: "date-time" },
                eventPublishOnDate: { type: "string", format: "date-time" },
                eventDescription: { type: "string" },
                eventLocation: {
                  type: "object",
                  properties: {
                    coordinates: {
                      type: "object",
                      properties: {
                        lat: { type: "number" },
                        lng: { type: "number" },
                      },
                    },
                    zipCode: { type: "number" },
                    address: { type: "string" },
                  },
                },
                eventCategory: { type: "string" },
                eventStatus: {
                  type: "string",
                  enum: ["scheduled", "cancelled", "postponed"],
                },
                eventArenaImageUrl: { type: "string", format: "uri" },
                eventCurrencyType: { type: "string" },
                eventLimitPerUser: { type: "number" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Event updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Event updated successfully" },
                  data: { $ref: "#/components/schemas/Event" },
                },
              },
            },
          },
        },
        "400": {
          description: "Bad request - cannot update past event",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "403": {
          description: "Forbidden - event does not belong to this creator",
        },
        "404": {
          description: "Event not found",
        },
      },
    },
  },
  "/v1/api/events/creator/{creatorId}": {
    get: {
      summary: "Get events by creator",
      description: "Retrieves all events created by a specific creator with optional filters.",
      tags: ["Events"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "creatorId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the creator",
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["scheduled", "cancelled", "postponed"] },
          description: "Filter by event status",
        },
        {
          name: "page",
          in: "query",
          schema: { type: "number", default: 1 },
          description: "Page number for pagination",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "number", default: 10, maximum: 50 },
          description: "Number of items per page",
        },
      ],
      responses: {
        "200": {
          description: "Events fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Events fetched successfully" },
                  data: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Event" },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          total: { type: "number" },
                          page: { type: "number" },
                          limit: { type: "number" },
                          totalPages: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid creator ID",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
      },
    },
  },
};
