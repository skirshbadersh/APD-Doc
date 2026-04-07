import { NextResponse } from "next/server";

// Query: find next client with pending contacts this month
// Implementation in Step 7
export async function GET() {
  return NextResponse.json({ message: "Next client query — not yet implemented" }, { status: 501 });
}
