import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SP_SYSTEM_PROMPT } from "@/lib/claude/extract-sp";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { pdf_base64 } = await request.json();

    if (!pdf_base64) {
      return NextResponse.json(
        { error: "No PDF data provided" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf_base64,
              },
            },
            {
              type: "text",
              text: "Extract all client data from this Support Plan PDF.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Strip any markdown code fences Claude might add despite instructions
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof SyntaxError
      ? "Could not parse document. Claude returned invalid JSON. Please try again or enter manually."
      : err instanceof Error
        ? err.message
        : "An unexpected error occurred";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
