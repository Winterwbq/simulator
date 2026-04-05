import { communityPartnershipScenario } from "./scenario-community-partnership";
import { regulatoryAffairsScenario } from "./scenario-regulatory-affairs";
import { story as chiefOfStaffScenario } from "./story";
import type { Story } from "../lib/types";

export const scenarios: Story[] = [
  chiefOfStaffScenario,
  regulatoryAffairsScenario,
  communityPartnershipScenario,
];

export function getScenarioById(id: string | null | undefined): Story | null {
  if (!id) {
    return null;
  }

  return scenarios.find((scenario) => scenario.meta.id === id) ?? null;
}

export function getRandomScenario(excludeId?: string): Story {
  const eligibleScenarios =
    excludeId && scenarios.length > 1
      ? scenarios.filter((scenario) => scenario.meta.id !== excludeId)
      : scenarios;
  const index = Math.floor(Math.random() * eligibleScenarios.length);
  return eligibleScenarios[index] ?? scenarios[0];
}
