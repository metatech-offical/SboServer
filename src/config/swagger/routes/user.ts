export const userPaths = {
  "/v1/api/user/send-verification-email": {
    get: {
      summary: "Send email verification mail",
      description: "Sends an email verification mail to the user.",
      tags: ["User"],
      responses: {
        "200": {
          description: "Email sent successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Email sent successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string", example: "Unauthorized" },
                },
              },
            },
          },
        },
      },
    },
  },
};
