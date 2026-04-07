import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  convertInchesToTwip,
} from "docx";
import { markdownToDocxRuns } from "@/lib/rich-text";

interface NoteInput {
  month: number;
  year: number;
  slot: 1 | 2;
  contactType: string;
  category: string;
  date: string;
  text: string;
}

interface ExportRequest {
  clientName: string;
  spYear: string;
  wscName: string;
  qoName: string;
  notes: NoteInput[];
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CAT_LABELS: Record<string, string> = {
  monthly_tc: "Monthly TC", monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review", hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution", pre_sp_activities: "Pre-SP Activities",
  sp_meeting_ff: "SP Meeting FF", sp_delivery: "SP Delivery",
  provider_contact: "Provider Contact", adm_cp_adjustment: "CP Adjustment",
  adm_sa_distribution: "SA Distribution", cdc_related: "CDC",
  developing_resources: "Resources", custom: "Custom",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Convert a note's markdown text into docx Paragraph objects.
 * Splits on double newlines for paragraphs, parses **bold** within each.
 */
function noteTextToParagraphs(text: string): Paragraph[] {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(
    (para) =>
      new Paragraph({
        spacing: { after: 120 },
        children: markdownToDocxRuns(para.trim()).map(
          (run) =>
            new TextRun({
              text: run.text,
              bold: run.bold,
              font: "Calibri",
              size: 22, // 11pt
            })
        ),
      })
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { clientName, spYear, wscName, qoName, notes } = body;

    if (!clientName || !notes) {
      return NextResponse.json({ error: "clientName and notes are required" }, { status: 400 });
    }

    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Group notes by month
    const notesByMonth = new Map<string, NoteInput[]>();
    for (const note of notes) {
      const key = `${note.year}-${String(note.month).padStart(2, "0")}`;
      if (!notesByMonth.has(key)) notesByMonth.set(key, []);
      notesByMonth.get(key)!.push(note);
    }

    // Build all 12 months (even if some have no notes)
    const allMonthKeys: string[] = [];
    if (notes.length > 0) {
      const firstNote = notes[0];
      for (let i = 0; i < 12; i++) {
        let m = firstNote.month + i;
        let y = firstNote.year;
        if (m > 12) { m -= 12; y++; }
        allMonthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }

    // Build document sections
    const children: Paragraph[] = [];

    // ---- TITLE PAGE ----
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000 },
        children: [
          new TextRun({
            text: clientName,
            bold: true,
            font: "Calibri",
            size: 48, // 24pt
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Progress Notes — SP Year ${spYear}`,
            font: "Calibri",
            size: 28, // 14pt
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `WSC: ${wscName}`,
            font: "Calibri",
            size: 22,
          }),
        ],
      })
    );
    if (qoName) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: qoName,
              font: "Calibri",
              size: 22,
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Generated: ${today}`,
            font: "Calibri",
            size: 20,
            italics: true,
          }),
        ],
      })
    );
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ---- BODY: each month ----
    for (let idx = 0; idx < allMonthKeys.length; idx++) {
      const key = allMonthKeys[idx];
      const [yStr, mStr] = key.split("-");
      const monthNum = parseInt(mStr);
      const yearNum = parseInt(yStr);
      const monthNotes = notesByMonth.get(key) || [];

      // Month heading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 200 },
          children: [
            new TextRun({
              text: `${MONTH_NAMES[monthNum]} ${yearNum}`,
              bold: true,
              font: "Calibri",
              size: 32, // 16pt
            }),
          ],
        })
      );

      if (monthNotes.length === 0) {
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "[No notes generated for this month]",
                italics: true,
                font: "Calibri",
                size: 22,
              }),
            ],
          })
        );
      } else {
        // Sort by slot
        monthNotes.sort((a, b) => a.slot - b.slot);

        for (const note of monthNotes) {
          const catLabel = CAT_LABELS[note.category] || note.category;

          // Contact heading
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 120 },
              children: [
                new TextRun({
                  text: `Contact ${note.slot} — ${note.contactType} (${catLabel}) — ${note.date}`,
                  bold: true,
                  font: "Calibri",
                  size: 24, // 12pt
                }),
              ],
            })
          );

          // Note body — split into paragraphs, parse bold
          children.push(...noteTextToParagraphs(note.text));

          // Small spacer
          children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
        }
      }

      // Page break between months (except after the last)
      if (idx < allMonthKeys.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    // ---- BUILD DOCUMENT ----
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22, // 11pt
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
              },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const filename = `${sanitizeFilename(clientName)}_SP_${sanitizeFilename(spYear)}_Notes.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
