import type { DraftGradeResult, DraftGradingHealth, Message, ReplyType } from "./types";

export async function fetchDraftGradingHealth(): Promise<DraftGradingHealth> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("Could not reach the local grading server.");
  }

  return (await response.json()) as DraftGradingHealth;
}

export async function gradeReplyWithApi(input: {
  replyText: string;
  replyType: ReplyType;
  message: Message;
  source?: "preset" | "draft";
  responseLabel?: string;
}): Promise<DraftGradeResult> {
  const response = await fetch("/api/grade-reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(errorPayload?.error ?? "Reply grading request failed.");
  }

  return (await response.json()) as DraftGradeResult;
}
