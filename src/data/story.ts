import type { Story } from "../lib/types";

export const story: Story = {
  meta: {
    id: "helios-chief-of-staff",
    title: "Helios Pilot Inbox Simulator",
    role: "Chief of Staff at Helios Commons",
    setting:
      "A fusion startup is preparing a pilot plant announcement after a late-stage materials test raises new uncertainty.",
    briefing: {
      situation:
        "A late-stage shield test raised new uncertainty just as Helios prepares a pilot plant announcement. Regulators, neighbors, investors, engineers, and reporters are all starting to ask whether the company can be trusted under pressure.",
      todayJob:
        "Read the incoming emails, decide how Helios responds, and shape the narrative before the external statement is due.",
      successCondition:
        "Keep trust high enough across key stakeholders to reach a credible ending before the 5:00 PM press deadline.",
      moreContext: [
        "Why this matters: this moment affects future siting fights, financing, and oversight, not just one test result.",
        "Regulators: watching for early notice, transparency, and whether uncertainty is handled responsibly.",
        "Neighbors: want plain-language answers and proof that local concerns are part of the decision process.",
        "Investors and engineers: investors care about discipline and predictability, while engineering wants technical honesty instead of spin.",
        "Media: if Helios leaves a vacuum, reporters and outside observers will define the story first.",
      ],
    },
    start_messages: ["m1", "m2"],
    initial_trust: {
      regulator: 50,
      investor: 50,
      community: 50,
      engineering: 50,
      media: 50,
    },
  },
  messages: {
    m1: {
      id: "m1",
      from: "Maya Chen, CEO",
      stakeholder: "internal",
      subject: "Pilot plant timeline after shield test anomaly",
      time: "Day 1, 09:05",
      body:
        "Last night's neutron shield test exposed faster wear than expected.\nWe can still keep the launch deck on schedule if we frame this as routine iteration.\nThe question is whether we proactively disclose the uncertainty now or stay tightly scripted until the board call.",
      choices: [
        {
          label: "Disclose the uncertainty now and request a revised review meeting",
          next: ["m3", "m4", "m8"],
          effects: {
            regulator: 10,
            investor: -5,
            engineering: 5,
            media: 2,
          },
          log: "disclose uncertainty and ask for a revised regulatory review meeting",
        },
        {
          label: "Keep the public schedule and circulate only a minimal internal note",
          next: ["m4", "m5", "m8"],
          effects: {
            investor: 6,
            regulator: -10,
            engineering: -4,
            media: -8,
          },
          log: "keep the launch schedule fixed and limit disclosure",
        },
      ],
    },
    m2: {
      id: "m2",
      from: "Rosa Alvarez, Community Coalition Lead",
      stakeholder: "community",
      subject: "Neighbors want answers on water use and truck traffic",
      time: "Day 1, 09:40",
      body:
        "Residents heard the pilot plant construction window may move up.\nThey are asking for plain-language answers on cooling water, road closures, and emergency planning.\nIf we do not host something visible this week, people will assume the company is avoiding them.",
      choices: [
        {
          label: "Hold an open town hall with engineers and take live questions",
          next: ["m6", "m7"],
          effects: {
            community: 12,
            engineering: 3,
            media: 3,
            investor: -2,
          },
          log: "host an open town hall with engineers present",
        },
        {
          label: "Send a polished FAQ first and postpone the public meeting",
          next: ["m6", "m9"],
          effects: {
            community: -8,
            investor: 2,
            media: -5,
          },
          log: "send a written FAQ and delay direct community engagement",
        },
      ],
    },
    m3: {
      id: "m3",
      from: "Dana Brooks, State Fusion Regulator",
      stakeholder: "regulator",
      subject: "Appreciate the early notice on materials performance",
      time: "Day 1, 10:15",
      body:
        "Thank you for flagging the shield wear result before the public briefing.\nMy team can make time this afternoon if Helios shares the current uncertainty bounds.\nEarly notice helps us keep this in a technical lane instead of an enforcement lane.",
      choices: [],
    },
    m4: {
      id: "m4",
      from: "Noah Singh, Horizon Ventures",
      stakeholder: "investor",
      subject: "Board members are asking whether the commercial date is still intact",
      time: "Day 1, 10:35",
      body:
        "The board can absorb bad news better than surprise delays.\nWhat they need is confidence that Helios is governing the uncertainty, not improvising it.\nPlease let me know whether tonight's narrative is timeline-first or trust-first.",
      choices: [],
    },
    m5: {
      id: "m5",
      from: "Elena Park, Great Lakes Ledger",
      stakeholder: "media",
      subject: "Hearing chatter about a test issue at the pilot site",
      time: "Day 1, 10:50",
      body:
        "A contractor just told us the materials team was called in overnight.\nIf there is a safety or schedule implication, I'd prefer to hear it from Helios directly.\nI am filing later today and would rather not write around a company silence.",
      choices: [],
    },
    m6: {
      id: "m6",
      from: "Rosa Alvarez, Community Coalition Lead",
      stakeholder: "community",
      subject: "People are watching how Helios responds this week",
      time: "Day 1, 11:20",
      body:
        "Residents can tolerate uncertainty when they feel respected.\nThey react badly when decisions seem finalized before anyone local is briefed.\nYour next public move will tell them whether Helios sees the town as a partner or a backdrop.",
      choices: [],
    },
    m7: {
      id: "m7",
      from: "Ibrahim Khan, Chief Engineer",
      stakeholder: "engineering",
      subject: "Technical team is willing to join the town hall",
      time: "Day 1, 11:45",
      body:
        "The engineers are tired, but they would rather explain the test honestly than watch comms flatten it.\nIf we are going public, we should say what we know, what we do not know, and what test comes next.\nThat keeps the team aligned internally too.",
      choices: [],
    },
    m8: {
      id: "m8",
      from: "Priya Desai, General Counsel",
      stakeholder: "internal",
      subject: "Need final call on tonight's external statement",
      time: "Day 1, 13:10",
      body:
        "We can issue a measured update that names the uncertainty and cites an outside review.\nOr we can publish a more confident note, keep the review internal, and try to protect momentum.\nNeither option is legally impossible; this is mostly a governance choice.",
      choices: [
        {
          label: "Publish a measured update and invite outside review",
          next: ["m10", "m11"],
          effects: {
            regulator: 8,
            community: 6,
            media: 10,
            investor: -3,
            engineering: 2,
          },
          log: "publish a measured update and invite outside review",
        },
        {
          label: "Release an optimistic statement and keep the review internal",
          next: ["m10", "m11"],
          effects: {
            investor: 6,
            regulator: -10,
            community: -6,
            media: -15,
            engineering: -4,
          },
          log: "issue an optimistic statement and keep the review internal",
        },
      ],
    },
    m9: {
      id: "m9",
      from: "Miles Grant, PR Director",
      stakeholder: "media",
      subject: "FAQ screenshots are circulating without context",
      time: "Day 1, 12:05",
      body:
        "The written FAQ bought us a few hours, but people are posting cropped answers online.\nWithout a live forum, the thread is becoming 'they already decided.'\nWe can still recover, but the next statement has to sound less managed and more accountable.",
      choices: [],
    },
    m10: {
      id: "m10",
      from: "Elena Park, Great Lakes Ledger",
      stakeholder: "media",
      subject: "Draft headline depends on whether Helios is owning the uncertainty",
      time: "Day 1, 18:30",
      body:
        "The tone of tonight's coverage will track whether the company treated this like a technical update or a credibility test.\nSources are comparing your statement with what neighbors and regulators heard during the day.\nConsistency matters more than polish at this point.",
      choices: [],
    },
    m11: {
      id: "m11",
      from: "Maya Chen, CEO",
      stakeholder: "internal",
      subject: "Board debrief before tomorrow morning",
      time: "Day 1, 20:10",
      body:
        "Whatever happens next, today's choices set the baseline for future siting fights, financing, and oversight.\nFusion is not only a technical promise here; it is a trust relationship under stress.\nPlease save the full log so we can use it in tomorrow's governance review.",
      choices: [],
    },
  },
  endings: [
    {
      name: "Trusted path",
      condition: {
        regulator: ">=65",
        community: ">=60",
        media: ">=55",
      },
      text:
        "Helios treated commercialization as a public trust problem, not just a timeline problem. By disclosing uncertainty, engaging the community, and inviting outside review, you turned a fragile moment into a credible governance story.",
    },
    {
      name: "Trust collapse",
      condition: {
        media: "<=30",
      },
      text:
        "The effort to protect momentum made Helios look evasive. Reporters, residents, and regulators began comparing notes, and the gap between the official narrative and lived experience became the story.",
    },
  ],
};
