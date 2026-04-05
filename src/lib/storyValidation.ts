import { ENDING_PATTERN } from "./constants";
import { KNOWN_STAKEHOLDERS } from "./types";
import type { Story } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTrustValue(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 100;
}

export function validateStory(story: unknown): string[] {
  const errors: string[] = [];

  if (!isPlainObject(story)) {
    return ["The root of story.json must be a JSON object."];
  }

  const storyObject = story as Record<string, unknown>;
  const meta = storyObject.meta;
  const messages = storyObject.messages;
  const endings = storyObject.endings;

  if (!isPlainObject(meta)) {
    errors.push("`meta` must be an object.");
  }
  if (!isPlainObject(messages) || Object.keys(messages).length === 0) {
    errors.push("`messages` must be a non-empty object.");
  }
  if (!Array.isArray(endings) || endings.length === 0) {
    errors.push("`endings` must be a non-empty list.");
  }

  if (errors.length > 0) {
    return errors;
  }

  const metaObject = meta as Record<string, unknown>;
  const requiredMetaFields = ["id", "title", "role", "setting", "start_messages", "initial_trust"];
  for (const field of requiredMetaFields) {
    if (!(field in metaObject)) {
      errors.push(`\`meta.${field}\` is required.`);
    }
  }

  const startMessages = metaObject.start_messages;
  const initialTrust = metaObject.initial_trust;
  const deadline = metaObject.deadline;
  const messagesObject = messages as Record<string, unknown>;
  const messageIds = new Set(Object.keys(messagesObject));

  if (typeof metaObject.id !== "string" || metaObject.id.trim().length === 0) {
    errors.push("`meta.id` must be a non-empty string.");
  }

  if (!Array.isArray(startMessages) || startMessages.length === 0) {
    errors.push("`meta.start_messages` must be a non-empty list.");
  } else {
    for (const messageId of startMessages) {
      if (typeof messageId !== "string" || !messageIds.has(messageId)) {
        errors.push(`\`meta.start_messages\` references unknown message ID \`${String(messageId)}\`.`);
      }
    }
  }

  if (!isPlainObject(initialTrust)) {
    errors.push("`meta.initial_trust` must be an object.");
  } else {
    const missingTrust = KNOWN_STAKEHOLDERS.filter((key) => !(key in initialTrust));
    const extraTrust = Object.keys(initialTrust).filter(
      (key) => !KNOWN_STAKEHOLDERS.includes(key as (typeof KNOWN_STAKEHOLDERS)[number]),
    );

    for (const key of missingTrust) {
      errors.push(`\`meta.initial_trust.${key}\` is required.`);
    }
    for (const key of extraTrust) {
      errors.push(`\`meta.initial_trust.${key}\` is not a known stakeholder.`);
    }
    for (const stakeholder of Object.keys(initialTrust)) {
      const value = initialTrust[stakeholder];
      if (
        KNOWN_STAKEHOLDERS.includes(stakeholder as (typeof KNOWN_STAKEHOLDERS)[number]) &&
        !isValidTrustValue(value)
      ) {
        errors.push(`\`meta.initial_trust.${stakeholder}\` must be a number between 0 and 100.`);
      }
    }
  }

  if (deadline !== undefined) {
    if (!isPlainObject(deadline)) {
      errors.push("`meta.deadline` must be an object when provided.");
    } else {
      for (const field of ["dueLabel", "deliverable", "consequence"] as const) {
        const value = deadline[field];
        if (value !== undefined && typeof value !== "string") {
          errors.push(`\`meta.deadline.${field}\` must be a string when provided.`);
        }
      }
    }
  }

  const requiredMessageFields = ["id", "from", "stakeholder", "subject", "time", "body", "choices"];
  for (const [messageId, message] of Object.entries(messagesObject)) {
    if (!isPlainObject(message)) {
      errors.push(`Message \`${messageId}\` must be an object.`);
      continue;
    }

    for (const field of requiredMessageFields) {
      if (!(field in message)) {
        errors.push(`Message \`${messageId}\` is missing required field \`${field}\`.`);
      }
    }

    if (message.id !== messageId) {
      errors.push(`Message \`${messageId}\` must have \`id\` set to \`${messageId}\`.`);
    }

    const choices = message.choices;
    if (!Array.isArray(choices)) {
      errors.push(`Message \`${messageId}\` must have a \`choices\` list.`);
      continue;
    }

    if (choices.length > 3) {
      errors.push(`Message \`${messageId}\` has more than 3 choices.`);
    }

    choices.forEach((choice, index) => {
      const choiceNumber = index + 1;
      if (!isPlainObject(choice)) {
        errors.push(`Choice ${choiceNumber} in message \`${messageId}\` must be an object.`);
        return;
      }

      for (const field of ["label", "next", "effects", "log"]) {
        if (!(field in choice)) {
          errors.push(
            `Choice ${choiceNumber} in message \`${messageId}\` is missing required field \`${field}\`.`,
          );
        }
      }

      const nextIds = choice.next;
      if (!Array.isArray(nextIds)) {
        errors.push(`Choice ${choiceNumber} in message \`${messageId}\` must have a \`next\` list.`);
      } else {
        for (const nextId of nextIds) {
          if (typeof nextId !== "string" || !messageIds.has(nextId)) {
            errors.push(
              `Choice ${choiceNumber} in message \`${messageId}\` references unknown message ID \`${String(nextId)}\`.`,
            );
          }
        }
      }

      const effects = choice.effects;
      if (!isPlainObject(effects)) {
        errors.push(`Choice ${choiceNumber} in message \`${messageId}\` must have an \`effects\` object.`);
      } else {
        for (const [stakeholder, delta] of Object.entries(effects)) {
          if (!KNOWN_STAKEHOLDERS.includes(stakeholder as (typeof KNOWN_STAKEHOLDERS)[number])) {
            errors.push(`Choice ${choiceNumber} in message \`${messageId}\` uses unknown stakeholder \`${stakeholder}\`.`);
          } else if (typeof delta !== "number") {
            errors.push(`Effect \`${stakeholder}\` in message \`${messageId}\` must be numeric.`);
          }
        }
      }
    });
  }

  (endings as unknown[]).forEach((ending, index) => {
    const endingNumber = index + 1;
    if (!isPlainObject(ending)) {
      errors.push(`Ending ${endingNumber} must be an object.`);
      return;
    }

    for (const field of ["name", "condition", "text"]) {
      if (!(field in ending)) {
        errors.push(`Ending ${endingNumber} is missing required field \`${field}\`.`);
      }
    }

    const condition = ending.condition;
    if (!isPlainObject(condition) || Object.keys(condition).length === 0) {
      errors.push(`Ending ${endingNumber} must have a non-empty \`condition\` object.`);
      return;
    }

    for (const [stakeholder, rule] of Object.entries(condition)) {
      if (!KNOWN_STAKEHOLDERS.includes(stakeholder as (typeof KNOWN_STAKEHOLDERS)[number])) {
        errors.push(`Ending ${endingNumber} uses unknown stakeholder \`${stakeholder}\`.`);
        continue;
      }
      if (typeof rule !== "string") {
        errors.push(`Ending ${endingNumber} condition for \`${stakeholder}\` must be a string.`);
        continue;
      }

      const match = ENDING_PATTERN.exec(rule.trim());
      if (!match) {
        errors.push(`Ending ${endingNumber} condition \`${rule}\` is invalid. Use >=, <=, >, or <.`);
        continue;
      }

      const threshold = Number.parseInt(match[2], 10);
      if (threshold < 0 || threshold > 100) {
        errors.push(`Ending ${endingNumber} condition for \`${stakeholder}\` must compare against 0 to 100.`);
      }
    }
  });

  return errors;
}

export function loadStory(): { story: Story | null; errors: string[] } {
  const errors = validateStory(storyModuleShape);
  return {
    story: errors.length === 0 ? (storyModuleShape as Story) : null,
    errors,
  };
}

import { story as storyModuleShape } from "../data/story";
