export const authenticationPaths = {
  "/v1/api/auth/email/signup": {
    post: {
      summary: "Sign up with email",
      description: "Signs up a user using email.",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "John" },
                email: { type: "string", example: "user@example.com" },
                password: { type: "string", example: "securepassword123" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "User created successfully",
        },
        "401": {
          description: "Error signing up",
          content: {
            "text/plain": {
              schema: { type: "string", example: "Error signing up" },
            },
          },
        },
      },
    },
  },
  "/v1/api/auth/email": {
    post: {
      summary: "Log in with email",
      description:
        "Authenticates a user using their email and returns user information along with cookies.",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", example: "user@example.com" },
                password: { type: "string", example: "securepassword123" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Successfully logged in",
          headers: {
            "Set-Cookie": {
              description: "Cookies set in the response",
              schema: {
                type: "array",
                items: {
                  type: "string",
                  example:
                    "appsession=abc123; Path=/; HttpOnly, appsession.sig=xyz456; Path=/; HttpOnly",
                },
              },
            },
          },
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "successful" },
                  user: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
        "401": {
          description: "Error logging in",
          content: {
            "text/plain": {
              schema: { type: "string", example: "Error logging in" },
            },
          },
        },
      },
    },
  },
};
