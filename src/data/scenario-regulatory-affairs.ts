import type { Story } from "../lib/types";

export const regulatoryAffairsScenario: Story = {
  meta: {
    id: "meridian-regulatory-affairs",
    title: "Meridian Licensing Inbox Simulator",
    role: "Director of Regulatory Affairs at Meridian Loop Energy",
    setting:
      "A fusion developer is approaching a staged state license review after a tritium inventory discrepancy appears during commissioning.",
    deadline: {
      deliverable: "Licensing update for the 5:00 PM state review call",
      consequence:
        "If you do not frame the issue first, the discrepancy will be interpreted as a governance failure instead of a controlled correction.",
    },
    briefing: {
      situation:
        "A tritium inventory discrepancy surfaced during commissioning just as Meridian prepares for a major licensing review. The question is no longer only technical; regulators, county officials, investors, engineers, and reporters are all watching how Meridian governs uncertainty.",
      todayJob:
        "Work through the inbox, decide how Meridian communicates the discrepancy, and protect the credibility of the licensing process before the evening review call.",
      successCondition:
        "Keep regulatory and public trust high enough to show that commercialization can survive serious oversight without slipping into defensive secrecy.",
      moreContext: [
        "Why this matters: fusion licensing depends on a reputation for disciplined self-reporting, not just passing a technical threshold.",
        "Regulators: watching whether Meridian escalates promptly, shares uncertainty bounds, and treats oversight as part of commercialization.",
        "County officials: want to know whether local emergency planning is being treated as a partner in governance or as a messaging problem.",
        "Investors and engineers: investors want confidence that the process stays under control, while engineers need corrective action to be described honestly.",
        "Media: if Meridian appears to be managing optics before governance, the discrepancy will quickly become a credibility story.",
      ],
    },
    start_messages: ["ra_m1", "ra_m2"],
    initial_trust: {
      regulator: 50,
      investor: 50,
      community: 50,
      engineering: 50,
      media: 50,
    },
  },
  messages: {
    ra_m1: {
      id: "ra_m1",
      from: "Lena Ortiz, COO",
      stakeholder: "internal",
      subject: "Need call on the tritium discrepancy before the state review",
      time: "Day 1, 09:00",
      body:
        "Operations found a tritium inventory mismatch during commissioning reconciliation.\nEngineering thinks it is explainable, but not fully bounded yet.\nDo we self-report the uncertainty immediately and ask the state for a corrective-action meeting, or wait until the numbers are tighter and fold it into the weekly packet?",
      choices: [
        {
          label: "Self-report now and request a corrective-action meeting with the state",
          next: ["ra_m3", "ra_m4", "ra_m8"],
          effects: {
            regulator: 10,
            engineering: 5,
            investor: -5,
            media: 3,
          },
          log: "self-report the discrepancy and request a corrective-action meeting",
        },
        {
          label: "Wait for tighter numbers and include it only in the weekly packet",
          next: ["ra_m4", "ra_m5", "ra_m8"],
          effects: {
            investor: 6,
            regulator: -10,
            engineering: -5,
            media: -8,
          },
          log: "wait for tighter numbers before disclosing the discrepancy",
        },
      ],
    },
    ra_m2: {
      id: "ra_m2",
      from: "Tom Becker, County Emergency Manager",
      stakeholder: "community",
      subject: "County officials need a briefing before this turns into rumor",
      time: "Day 1, 09:35",
      body:
        "My office is hearing that Meridian flagged something involving tritium handling.\nIf county officials are going to hear about this from reporters, trust will be very hard to rebuild.\nWe need to know whether Meridian will brief us live today or just circulate a memo.",
      choices: [
        {
          label: "Hold a live county briefing and publish a plain-language Q&A",
          next: ["ra_m6", "ra_m7"],
          effects: {
            community: 10,
            regulator: 4,
            media: 4,
            investor: -2,
          },
          log: "hold a live county briefing and publish a plain-language Q&A",
        },
        {
          label: "Send a written memo first and avoid a live briefing until numbers settle",
          next: ["ra_m6", "ra_m9"],
          effects: {
            community: -7,
            regulator: -3,
            media: -6,
            investor: 2,
          },
          log: "send a written memo and delay the county briefing",
        },
      ],
    },
    ra_m3: {
      id: "ra_m3",
      from: "Karen Liu, State Fusion Regulator",
      stakeholder: "regulator",
      subject: "Early notice keeps this in the licensing lane",
      time: "Day 1, 10:10",
      body:
        "Thank you for notifying the review team before the discrepancy spread further.\nIf Meridian can share the uncertainty bounds and the correction path this afternoon, we can treat this as a licensing discipline issue instead of a concealment issue.\nProcess matters here as much as the underlying cause.",
      choices: [],
    },
    ra_m4: {
      id: "ra_m4",
      from: "Samir Patel, North Lake Capital",
      stakeholder: "investor",
      subject: "Need confidence the review process is being governed",
      time: "Day 1, 10:30",
      body:
        "The board can handle a managed correction; what it cannot handle is a surprise enforcement narrative.\nPlease tell me whether Meridian is treating this as a process-governance issue or just a messaging risk.\nCommercialization depends on the first one.",
      choices: [],
    },
    ra_m5: {
      id: "ra_m5",
      from: "Jo Kim, Energy Statehouse Wire",
      stakeholder: "media",
      subject: "Hearing the state review team was not briefed yet",
      time: "Day 1, 10:50",
      body:
        "Two sources say Meridian found an inventory issue during commissioning but has not walked the state through it yet.\nIf that is wrong, I would like the correction from Meridian directly.\nIf it is right, the delay itself may become the story.",
      choices: [],
    },
    ra_m6: {
      id: "ra_m6",
      from: "Tom Becker, County Emergency Manager",
      stakeholder: "community",
      subject: "Local trust depends on being treated as part of the process",
      time: "Day 1, 11:15",
      body:
        "County officials do not expect perfect operations.\nThey do expect Meridian to act as if emergency planning and public confidence are part of commercialization, not external optics.\nThe order in which you brief people matters.",
      choices: [],
    },
    ra_m7: {
      id: "ra_m7",
      from: "Nadia Rahman, Fuel Cycle Engineering Lead",
      stakeholder: "engineering",
      subject: "The technical team wants the corrective action described plainly",
      time: "Day 1, 11:40",
      body:
        "Engineering is comfortable explaining what we know, what remains uncertain, and what data closes the gap.\nThat is better than pretending the discrepancy is fully solved when it is still under review.\nIf the external story outruns the actual corrective action, internal trust will suffer too.",
      choices: [],
    },
    ra_m8: {
      id: "ra_m8",
      from: "Diane Fuller, General Counsel",
      stakeholder: "internal",
      subject: "Need final call on the state review deck",
      time: "Day 1, 13:05",
      body:
        "We can publish a corrective-action memo, revise the milestone schedule, and show the state how Meridian is governing the discrepancy.\nOr we can keep the memo internal, present the milestone as unchanged, and try to avoid feeding concern before the review call.\nNeither choice is purely legal; it is mostly about governance posture.",
      choices: [
        {
          label: "Publish the corrective-action memo and revise the milestone schedule",
          next: ["ra_m10", "ra_m11"],
          effects: {
            regulator: 8,
            community: 4,
            media: 9,
            investor: -4,
            engineering: 3,
          },
          log: "publish the corrective-action memo and revise the milestone schedule",
        },
        {
          label: "Keep the corrective-action memo internal and keep the milestone unchanged",
          next: ["ra_m10", "ra_m11"],
          effects: {
            investor: 6,
            regulator: -10,
            community: -5,
            media: -12,
            engineering: -4,
          },
          log: "keep the corrective-action memo internal and preserve the milestone externally",
        },
      ],
    },
    ra_m9: {
      id: "ra_m9",
      from: "Miles Green, County Commissioner",
      stakeholder: "community",
      subject: "Written notes are not a substitute for accountable briefing",
      time: "Day 1, 12:00",
      body:
        "A memo without questions answered live makes it look like Meridian is trying to control who gets context and who does not.\nThat is precisely the kind of pattern that turns a manageable issue into a political one.\nIf you still want local trust, the next interaction has to be more direct.",
      choices: [],
    },
    ra_m10: {
      id: "ra_m10",
      from: "Jo Kim, Energy Statehouse Wire",
      stakeholder: "media",
      subject: "Tonight's coverage depends on whether Meridian governed the gap",
      time: "Day 1, 18:20",
      body:
        "The difference between 'commissioning correction' and 'credibility problem' is now mostly about process.\nSources are comparing what regulators, county officials, and investors were told during the day.\nIf those stories line up, Meridian looks disciplined. If not, it looks evasive.",
      choices: [],
    },
    ra_m11: {
      id: "ra_m11",
      from: "Lena Ortiz, COO",
      stakeholder: "internal",
      subject: "Board debrief for tomorrow's licensing discussion",
      time: "Day 1, 19:40",
      body:
        "Today's choices will shape whether Meridian is seen as licensable under stress or merely optimistic under stress.\nFusion commercialization only works if regulators and local officials believe we govern uncertainty before they force us to.\nSave the full log for tomorrow's licensing posture review.",
      choices: [],
    },
  },
  endings: [
    {
      name: "Licensed credibility",
      condition: {
        regulator: ">=65",
        engineering: ">=60",
        community: ">=55",
      },
      text:
        "Meridian showed that commercialization can absorb serious oversight when governance is visible, disciplined, and early. Regulators stayed in a technical lane because you treated process credibility as part of the product.",
    },
    {
      name: "Oversight spiral",
      condition: {
        media: "<=30",
      },
      text:
        "The discrepancy became a governance story before Meridian finished explaining the technical one. Once local officials, regulators, and reporters started comparing timelines, the delay itself became evidence of weak commercialization discipline.",
    },
  ],
};
