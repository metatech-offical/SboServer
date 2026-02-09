import { Schema, model } from "mongoose";
import { IEventTicket, TicketStatus } from "./event.types";
import { collectionNames } from "../../constants/collectionNames";

const eventTicketSchema = new Schema<IEventTicket>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.EVENT,
      required: true,
      index: true,
    },
    ticketName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfTickets: {
      type: Number,
      required: true,
      min: 1,
    },
    numberOfSoldTickets: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    ticketStatus: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.AVAILABLE,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for event ticket queries
eventTicketSchema.index({ eventId: 1, ticketStatus: 1 });

// Middleware to automatically update ticket status based on availability
eventTicketSchema.pre("save", function (next) {
  if (this.numberOfSoldTickets >= this.numberOfTickets) {
    this.ticketStatus = TicketStatus.SOLD_OUT;
  } else {
    this.ticketStatus = TicketStatus.AVAILABLE;
  }
  next();
});

// Validation: numberOfSoldTickets cannot exceed numberOfTickets
eventTicketSchema.pre("save", function (next) {
  if (this.numberOfSoldTickets > this.numberOfTickets) {
    const error = new Error("Number of sold tickets cannot exceed total number of tickets");
    return next(error);
  }
  next();
});

// Helper function to update event's lowestTicketPrice
const updateEventLowestTicketPrice = async (eventId: any) => {
  try {
    // Use mongoose.model to avoid circular dependency
    const Event = model(collectionNames.EVENT);
    const EventTicketModel = model<IEventTicket>(collectionNames.EVENT_TICKET);
    
    const tickets = await EventTicketModel.find({
      eventId: eventId,
    });
    
    if (tickets.length > 0) {
      const lowestPrice = Math.min(...tickets.map((t) => t.originalPrice));
      await Event.findByIdAndUpdate(eventId, {
        lowestTicketPrice: lowestPrice,
      });
    } else {
      // If no tickets left, set to null
      await Event.findByIdAndUpdate(eventId, {
        $unset: { lowestTicketPrice: "" },
      });
    }
  } catch (error) {
    // Silently fail to avoid breaking ticket operations
    console.error("Error updating event lowestTicketPrice:", error);
  }
};

// Update event's lowestTicketPrice when tickets are created or updated
eventTicketSchema.post("save", async function () {
  await updateEventLowestTicketPrice(this.eventId);
});

// Update event's lowestTicketPrice when tickets are deleted
eventTicketSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await updateEventLowestTicketPrice(doc.eventId);
  }
});

export const EventTicket = model<IEventTicket>(collectionNames.EVENT_TICKET, eventTicketSchema);
