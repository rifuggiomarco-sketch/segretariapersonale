import { invokeLLM } from "./_core/llm";
import type { InsertWeeklyShift } from "../drizzle/schema";

export interface ExtractedShift {
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  notes?: string;
}

/**
 * Extract weekly shifts from an image/PDF using Claude AI
 */
export async function extractShiftsFromImage(imageUrl: string): Promise<ExtractedShift[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at reading work schedules, shift tables, and calendars from images and PDFs. 
Extract all weekly shifts and return them as a JSON array.
For each shift, extract:
- dayOfWeek: Monday through Sunday
- startTime: in HH:MM format (24-hour)
- endTime: in HH:MM format (24-hour)
- notes: any additional notes about the shift (optional)

Return ONLY a valid JSON array, no other text. If no shifts are found, return an empty array [].
Example format:
[
  {"dayOfWeek": "Monday", "startTime": "09:00", "endTime": "17:00", "notes": ""},
  {"dayOfWeek": "Tuesday", "startTime": "09:00", "endTime": "17:00", "notes": "Lunch 12-13"}
]`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please extract all the work shifts from this schedule image:",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_shifts",
        strict: true,
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dayOfWeek: {
                type: "string",
                enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              },
              startTime: {
                type: "string",
                pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
              },
              endTime: {
                type: "string",
                pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
              },
              notes: {
                type: "string",
              },
            },
            required: ["dayOfWeek", "startTime", "endTime"],
          },
        },
      },
    },
  });

  try {
    const content = response.choices[0]?.message.content;
    if (!content) return [];

    // Handle both string and array content types
    const contentStr = typeof content === 'string' ? content : 
                       Array.isArray(content) ? JSON.stringify(content) : '';
    
    if (!contentStr) return [];
    
    const parsed = JSON.parse(contentStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[ShiftExtractor] Failed to parse AI response:", error);
    return [];
  }
}

/**
 * Convert extracted shifts to database format for a specific week
 */
export function convertShiftsToDatabase(
  extracted: ExtractedShift[],
  userId: number,
  weekStartDate: Date
): InsertWeeklyShift[] {
  return extracted.map((shift) => ({
    userId,
    weekStartDate,
    dayOfWeek: shift.dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
    notes: shift.notes || null,
  }));
}
