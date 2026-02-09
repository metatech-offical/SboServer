export const ticketOrderPaths = {
  "/v1/api/ticket-orders/create": {
    post: {
      summary: "Create a ticket order",
      description:
        "Books tickets for an event. Handles inventory management atomically to prevent overselling. Enforces per-user ticket limits. Returns confirmed order immediately (no payment integration yet).",
      tags: ["Ticket Orders"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["eventId", "tickets"],
              properties: {
                eventId: {
                  type: "string",
                  example: "60d0fe4f5311236168a109ca",
                  description: "The ID of the event",
                },
                tickets: {
                  type: "array",
                  minItems: 1,
                  description: "List of tickets to book",
                  items: {
                    type: "object",
                    required: ["eventTicketId", "quantity"],
                    properties: {
                      eventTicketId: {
                        type: "string",
                        example: "60d0fe4f5311236168a109cb",
                        description: "ID of the ticket type",
                      },
                      quantity: {
                        type: "number",
                        minimum: 1,
                        maximum: 50,
                        example: 2,
                        description: "Number of tickets to book",
                      },
                    },
                  },
                },
              },
              description: "Note: Attendee information (name, email, phone) is automatically taken from the authenticated user's profile.",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Ticket order created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Ticket order created successfully",
                  },
                  data: { $ref: "#/components/schemas/EventTicketOrder" },
                },
              },
            },
          },
        },
        "400": {
          description:
            "Bad request - invalid tickets, insufficient quantity, ticket limit exceeded, event cancelled, or past event",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example: "Insufficient tickets available",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "404": {
          description: "Event not found",
        },
        "409": {
          description: "Conflict - race condition, tickets just sold out",
        },
      },
    },
  },
  "/v1/api/ticket-orders": {
    get: {
      summary: "Get user's ticket orders",
      description: "Retrieves all ticket orders for the authenticated user with filtering and pagination.",
      tags: ["Ticket Orders"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["pending", "confirmed", "cancelled", "refunded", "failed"],
          },
          description: "Filter by order status",
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
          description: "Orders fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Orders fetched successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      orders: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EventTicketOrder" },
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
  "/v1/api/ticket-orders/{orderId}": {
    get: {
      summary: "Get order by ID",
      description: "Retrieves a specific ticket order. Users can only view their own orders.",
      tags: ["Ticket Orders"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the order",
        },
      ],
      responses: {
        "200": {
          description: "Order fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Order fetched successfully" },
                  data: { $ref: "#/components/schemas/EventTicketOrder" },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid order ID",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "404": {
          description: "Order not found",
        },
      },
    },
  },
  "/v1/api/ticket-orders/{orderId}/cancel": {
    post: {
      summary: "Cancel ticket order",
      description:
        "Cancels a ticket order and restores inventory atomically. Only the user who created the order can cancel it.",
      tags: ["Ticket Orders"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the order",
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                cancellationReason: {
                  type: "string",
                  maxLength: 500,
                  example: "Plans changed",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Order cancelled successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Ticket order cancelled successfully",
                  },
                  data: { $ref: "#/components/schemas/EventTicketOrder" },
                },
              },
            },
          },
        },
        "400": {
          description: "Order already cancelled or refunded",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "404": {
          description: "Order not found",
        },
      },
    },
  },
  "/v1/api/ticket-orders/event/{eventId}": {
    get: {
      summary: "Get orders for an event (creators only)",
      description:
        "Retrieves all ticket orders for a specific event. Only the event creator can access this. Includes order statistics.",
      tags: ["Ticket Orders"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "eventId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The unique identifier of the event",
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["pending", "confirmed", "cancelled", "refunded", "failed"],
          },
          description: "Filter by order status",
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
          description: "Orders fetched successfully with statistics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Orders fetched successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      orders: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EventTicketOrder" },
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
                      statistics: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: { type: "string", example: "confirmed" },
                            count: { type: "number", example: 42 },
                            totalRevenue: { type: "number", example: 12500 },
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
        "400": {
          description: "Invalid event ID",
        },
        "401": {
          description: "Unauthorized - user not authenticated",
        },
        "403": {
          description: "Forbidden - user is not the event creator",
        },
      },
    },
  },
};
