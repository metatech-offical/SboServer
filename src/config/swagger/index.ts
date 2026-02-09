import { authenticationPaths } from "./routes/authentication";
import { userPaths } from "./routes/user";
import { eventPaths } from "./routes/event";
import { ticketOrderPaths } from "./routes/ticketOrder";
import { shortsPaths } from "./routes/shorts";

export const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.1",
    info: {
      title: "API Documentation of Metastart",
      version: "1.0.0",
    },
    components: {
      schemas: {
        User: {
          type: "object",
          required: ["name", "email"],
          properties: {
            _id: {
              type: "string",
              description: "The unique identifier of the user",
              example: "60d0fe4f5311236168a109ca",
            },
            name: {
              type: "string",
              description: "The name of the user",
              example: "John",
            },
            email: {
              type: "string",
              description: "The email address of the user",
              example: "user@example.com",
            },
            dp: {
              type: "string",
              description: "The display picture URL of the user",
              example: "https://example.com/images/john.jpg",
            },
            password: {
              type: "string",
              description: "The password of the user",
              example: "securepassword123",
            },
            provider: {
              type: "object",
              properties: {
                provider: {
                  type: "string",
                  enum: ["email", "google"],
                  description: "The authentication provider of the user",
                  example: "email",
                },
              },
            },
            verified: {
              type: "boolean",
              description: "Indicates whether the user's email is verified",
              example: false,
            },
          },
        },
        Event: {
          type: "object",
          required: [
            "creatorId",
            "eventCoverImageUrl",
            "eventName",
            "eventDateTime",
            "eventPublishOnDate",
            "eventDescription",
            "eventLocation",
            "eventCategory",
            "eventCurrencyType",
            "eventLimitPerUser",
          ],
          properties: {
            _id: {
              type: "string",
              description: "The unique identifier of the event",
              example: "60d0fe4f5311236168a109ca",
            },
            creatorId: {
              type: "string",
              description: "The ID of the event creator",
              example: "60d0fe4f5311236168a109ca",
            },
            eventCoverImageUrl: {
              type: "string",
              description: "URL of the event cover image",
              example: "https://example.com/images/event-cover.jpg",
            },
            eventName: {
              type: "string",
              description: "Name of the event",
              example: "Summer Music Festival 2025",
            },
            eventDateTime: {
              type: "string",
              format: "date-time",
              description: "Date and time of the event",
              example: "2025-07-15T18:00:00Z",
            },
            eventPublishOnDate: {
              type: "string",
              format: "date-time",
              description: "Date when the event should be published",
              example: "2025-06-01T10:00:00Z",
            },
            eventDescription: {
              type: "string",
              description: "Description of the event",
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
            eventCategory: {
              type: "string",
              description: "Category of the event",
              example: "Music",
            },
            eventStatus: {
              type: "string",
              enum: ["scheduled", "cancelled", "postponed"],
              description: "Current status of the event",
              example: "scheduled",
            },
            eventArenaImageUrl: {
              type: "string",
              description: "URL of the event arena/venue image",
              example: "https://example.com/images/arena.jpg",
            },
            eventCurrencyType: {
              type: "string",
              description: "Currency type for ticket pricing",
              example: "USD",
            },
            eventLimitPerUser: {
              type: "number",
              description: "Maximum number of tickets a user can purchase (0 for unlimited)",
              example: 5,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the event was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the event was last updated",
            },
          },
        },
        EventTicket: {
          type: "object",
          required: [
            "eventId",
            "ticketName",
            "originalPrice",
            "numberOfTickets",
          ],
          properties: {
            _id: {
              type: "string",
              description: "The unique identifier of the ticket",
              example: "60d0fe4f5311236168a109ca",
            },
            eventId: {
              type: "string",
              description: "The ID of the associated event",
              example: "60d0fe4f5311236168a109ca",
            },
            ticketName: {
              type: "string",
              description: "Name of the ticket type",
              example: "VIP Pass",
            },
            originalPrice: {
              type: "number",
              description: "Original price of the ticket",
              example: 150,
            },
            numberOfTickets: {
              type: "number",
              description: "Total number of tickets available",
              example: 100,
            },
            numberOfSoldTickets: {
              type: "number",
              description: "Number of tickets already sold",
              example: 25,
            },
            ticketStatus: {
              type: "string",
              enum: ["available", "sold_out"],
              description: "Availability status of the ticket",
              example: "available",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the ticket was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the ticket was last updated",
            },
          },
        },
        EventTicketOrder: {
          type: "object",
          required: [
            "userId",
            "eventId",
            "orderNumber",
            "tickets",
            "totalAmount",
            "currency",
            "orderStatus",
            "paymentStatus",
            "attendeeEmail",
            "attendeeName",
          ],
          properties: {
            _id: {
              type: "string",
              description: "The unique identifier of the order",
              example: "60d0fe4f5311236168a109ca",
            },
            userId: {
              type: "string",
              description: "The ID of the user who placed the order",
              example: "60d0fe4f5311236168a109ca",
            },
            eventId: {
              type: "string",
              description: "The ID of the event",
              example: "60d0fe4f5311236168a109ca",
            },
            orderNumber: {
              type: "string",
              description: "Unique order number for reference",
              example: "ORD-ABC123-XYZ789",
            },
            tickets: {
              type: "array",
              description: "List of tickets in this order",
              items: {
                type: "object",
                properties: {
                  eventTicketId: {
                    type: "string",
                    example: "60d0fe4f5311236168a109cb",
                  },
                  ticketName: {
                    type: "string",
                    example: "VIP Pass",
                  },
                  price: {
                    type: "number",
                    example: 150,
                  },
                  quantity: {
                    type: "number",
                    example: 2,
                  },
                  subtotal: {
                    type: "number",
                    example: 300,
                  },
                },
              },
            },
            totalAmount: {
              type: "number",
              description: "Total order amount",
              example: 300,
            },
            currency: {
              type: "string",
              description: "Currency code",
              example: "USD",
            },
            orderStatus: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "refunded", "failed"],
              description: "Current status of the order",
              example: "confirmed",
            },
            paymentStatus: {
              type: "string",
              enum: ["pending", "completed", "failed", "refunded"],
              description: "Payment status",
              example: "completed",
            },
            paymentMethod: {
              type: "string",
              description: "Payment method used",
              example: "credit_card",
            },
            paymentTransactionId: {
              type: "string",
              description: "Payment gateway transaction ID",
              example: "txn_1234567890",
            },
            qrCode: {
              type: "string",
              description: "QR code for ticket validation",
              example: "QR-ORD-ABC123-1234567890",
            },
            attendeeEmail: {
              type: "string",
              format: "email",
              description: "Email of the attendee",
              example: "attendee@example.com",
            },
            attendeeName: {
              type: "string",
              description: "Name of the attendee",
              example: "John Doe",
            },
            attendeePhone: {
              type: "string",
              description: "Phone number of the attendee",
              example: "+1234567890",
            },
            cancelledAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the order was cancelled",
            },
            cancellationReason: {
              type: "string",
              description: "Reason for cancellation",
              example: "Plans changed",
            },
            refundedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the order was refunded",
            },
            refundAmount: {
              type: "number",
              description: "Amount refunded",
              example: 300,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the order was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the order was last updated",
            },
          },
        },
      },
    },
    paths: {
      ...authenticationPaths,
      ...userPaths,
      ...eventPaths,
      ...ticketOrderPaths,
    },
  },
  apis: ["src/routes/*.ts", "src/model/**/*.ts"],
};
