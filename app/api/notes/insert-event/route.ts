import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { noteText, eventDescription, eventDate } = await request.json();

    if (!noteText || !eventDescription) {
      return NextResponse.json(
        { error: "noteText and eventDescription are required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are editing a WSC progress note for a Florida APD waiver client. The following event occurred and needs to be incorporated naturally into the note. Rewrite the note to include this information in the appropriate section (health, services, safety, etc. — wherever it fits best). Maintain the same style, tone, and compliance language. Keep all existing content — only add the new information where it belongs. Return ONLY the updated note text with no explanation, no markdown, no backticks.`,
      messages: [
        {
          role: "user",
          content: `CURRENT NOTE:\n${noteText}\n\nEVENT TO ADD (occurred ${eventDate || "this month"}):\n${eventDescription}\n\nReturn the updated note text with the event naturally incorporated:`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    let updatedText = textBlock.text.trim();
    if (updatedText.startsWith("```")) {
      updatedText = updatedText.replace(/^```(?:\w+)?\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({ updatedText });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
