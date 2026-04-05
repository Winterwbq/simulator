import type { Story } from "../lib/types";

export const communityPartnershipScenario: Story = {
  meta: {
    id: "beacon-community-partnership",
    title: "Beacon Host Community Inbox Simulator",
    role: "Community Partnership Lead at Beacon Fusion Campus",
    setting:
      "A fusion developer is negotiating a host-community agreement and anchor offtake announcement for its first commercial campus.",
    deadline: {
      deliverable: "Joint host-community update before tonight's offtake briefing",
      consequence:
        "If local partners feel sidelined, the commercialization story will read as extraction instead of partnership.",
    },
    briefing: {
      situation:
        "Beacon is close to announcing its first commercial campus partnership, but the host community still wants real governance rights, emergency-notification commitments, and visible influence over benefits implementation. The question is whether Beacon treats that as a core commercialization requirement or as something to tidy up after the deal.",
      todayJob:
        "Work through the inbox, balance the offtake timetable against community legitimacy, and decide whether Beacon commercializes through partnership or around it.",
      successCondition:
        "Keep community, investor, and media trust high enough to show that fusion commercialization can be built with local legitimacy rather than despite it.",
      moreContext: [
        "Why this matters: first commercial campuses set expectations for future siting fights, labor talks, and benefit agreements across the industry.",
        "Host community: looking for procedural fairness, not just promises of jobs and tax base.",
        "Investors and offtakers: want schedule clarity, but a rushed announcement can create long-run governance risk.",
        "Regulators and plant staff: trust the project more when emergency planning and local commitments are explicit early, not retrofitted later.",
        "Media: if the host community looks like a backdrop instead of a partner, that becomes the narrative around commercialization.",
      ],
    },
    start_messages: ["cp_m1", "cp_m2"],
    initial_trust: {
      regulator: 50,
      investor: 50,
      community: 50,
      engineering: 50,
      media: 50,
    },
  },
  messages: {
    cp_m1: {
      id: "cp_m1",
      from: "Mayor Denise Harper",
      stakeholder: "community",
      subject: "Will the host advisory board have real authority?",
      time: "Day 1, 09:10",
      body:
        "Residents can support the campus if governance is real, not ceremonial.\nThey want a binding advisory board with standing review rights on emergency notification and local-impact reporting.\nIf Beacon only offers listening sessions, people will conclude the project wants support without shared authority.",
      choices: [
        {
          label: "Offer a binding advisory board with emergency-notification review rights",
          next: ["cp_m3", "cp_m4", "cp_m8"],
          effects: {
            community: 12,
            regulator: 4,
            media: 3,
            investor: -4,
          },
          log: "offer a binding advisory board with emergency-notification review rights",
        },
        {
          label: "Promise informal listening sessions first and keep governance internal for now",
          next: ["cp_m4", "cp_m5", "cp_m8"],
          effects: {
            investor: 5,
            community: -10,
            media: -7,
            regulator: -3,
          },
          log: "promise informal listening sessions while keeping governance internal",
        },
      ],
    },
    cp_m2: {
      id: "cp_m2",
      from: "Avery Long, Anchor Offtake Partner",
      stakeholder: "investor",
      subject: "Can Beacon keep the commercial announcement on schedule?",
      time: "Day 1, 09:40",
      body:
        "Our board is ready to support the campus announcement, but it wants clarity on whether Beacon can close the commercial story this week.\nIf the host-community package is still moving, we need to know whether Beacon intends to wait or announce first.\nDelay is manageable; governance confusion is harder.",
      choices: [
        {
          label: "Tell the offtake partner the announcement waits until local governance terms are shared",
          next: ["cp_m6", "cp_m7"],
          effects: {
            community: 6,
            investor: -5,
            media: 2,
            regulator: 2,
          },
          log: "delay the announcement until local governance terms are ready",
        },
        {
          label: "Lock the commercial announcement now and finalize community terms later",
          next: ["cp_m6", "cp_m9"],
          effects: {
            investor: 8,
            community: -8,
            media: -6,
            engineering: -2,
          },
          log: "lock the commercial announcement before community governance terms are finished",
        },
      ],
    },
    cp_m3: {
      id: "cp_m3",
      from: "Rina Flores, Neighborhood Coalition Chair",
      stakeholder: "community",
      subject: "A real governance offer changes the tone immediately",
      time: "Day 1, 10:20",
      body:
        "People can work through uncertainty when they believe the process will not exclude them.\nA binding advisory role signals that Beacon understands commercialization is partly about who gets standing to question the project.\nThat does more than another reassurance email would.",
      choices: [],
    },
    cp_m4: {
      id: "cp_m4",
      from: "Avery Long, Anchor Offtake Partner",
      stakeholder: "investor",
      subject: "Need confidence that governance choices will not derail execution",
      time: "Day 1, 10:40",
      body:
        "Our board is not allergic to local governance, but it needs to know Beacon is sequencing it deliberately.\nIf the process looks improvised, confidence in the commercial close drops fast.\nPlease tell us whether this is partnership-first or announcement-first.",
      choices: [],
    },
    cp_m5: {
      id: "cp_m5",
      from: "Harper Dale, Regional Energy Desk",
      stakeholder: "media",
      subject: "Hearing the host city still lacks a formal governance role",
      time: "Day 1, 10:55",
      body:
        "Several local sources say Beacon wants a polished commercial announcement before the governance package is settled.\nIf that is inaccurate, I would rather hear the correction directly from Beacon.\nIf it is accurate, the story becomes whether the project treats the host city as a partner or a prop.",
      choices: [],
    },
    cp_m6: {
      id: "cp_m6",
      from: "Janelle Price, Regional Labor Council",
      stakeholder: "community",
      subject: "People are measuring whether Beacon shares authority or just promises benefit",
      time: "Day 1, 11:20",
      body:
        "Jobs and tax promises matter, but they do not replace procedural fairness.\nIf the host city only gets input after commercial milestones are locked, workers and residents will assume the real decisions are already closed.\nThat is a trust problem before it is a labor problem.",
      choices: [],
    },
    cp_m7: {
      id: "cp_m7",
      from: "Owen Mills, Plant Operations Lead",
      stakeholder: "engineering",
      subject: "Clear governance commitments make operating plans easier too",
      time: "Day 1, 11:45",
      body:
        "Operations would rather work inside an explicit governance structure than improvise explanations later.\nIf emergency notification, escalation, and local review roles are clear now, the plant team can plan around them.\nThat is better than trying to retrofit trust after the announcement.",
      choices: [],
    },
    cp_m8: {
      id: "cp_m8",
      from: "Marta Silva, CEO",
      stakeholder: "internal",
      subject: "Need final call on tonight's host-community briefing",
      time: "Day 1, 13:15",
      body:
        "We can announce the commercial milestone together with the host-community governance package and show that Beacon sees local legitimacy as part of the campus launch.\nOr we can lead with the commercial milestone now, keep the governance package for later, and hope speed carries the day.\nThis is mostly a governance choice disguised as a sequencing choice.",
      choices: [
        {
          label: "Pair the commercial milestone with the host-community governance package",
          next: ["cp_m10", "cp_m11"],
          effects: {
            community: 10,
            regulator: 4,
            media: 8,
            investor: 4,
            engineering: 2,
          },
          log: "pair the commercial milestone with the host-community governance package",
        },
        {
          label: "Lead with the commercial milestone and delay the governance package",
          next: ["cp_m10", "cp_m11"],
          effects: {
            investor: 6,
            community: -10,
            media: -10,
            regulator: -4,
            engineering: -2,
          },
          log: "lead with the commercial milestone and delay the governance package",
        },
      ],
    },
    cp_m9: {
      id: "cp_m9",
      from: "Mayor Denise Harper",
      stakeholder: "community",
      subject: "Commercial speed without shared governance will read badly here",
      time: "Day 1, 12:10",
      body:
        "If Beacon announces first and negotiates shared governance second, residents will assume participation was never meant to shape the real timeline.\nThat may satisfy the market for a day, but it will not create durable permission to operate here.\nThe next move has to prove otherwise.",
      choices: [],
    },
    cp_m10: {
      id: "cp_m10",
      from: "Harper Dale, Regional Energy Desk",
      stakeholder: "media",
      subject: "Coverage will hinge on whether Beacon commercialized with the city or around it",
      time: "Day 1, 18:10",
      body:
        "What matters now is whether the commercial story and the host-community story reinforce each other.\nIf residents, local officials, and Beacon all tell the same sequence, tonight's coverage reads disciplined.\nIf not, the headline writes itself.",
      choices: [],
    },
    cp_m11: {
      id: "cp_m11",
      from: "Marta Silva, CEO",
      stakeholder: "internal",
      subject: "Tomorrow's board review will focus on local legitimacy",
      time: "Day 1, 19:30",
      body:
        "Today's choices will shape whether Beacon is remembered for building a campus with the host community or merely locating one inside it.\nCommercial fusion has to solve for legitimacy as well as revenue.\nSave the full log for tomorrow's governance debrief.",
      choices: [],
    },
  },
  endings: [
    {
      name: "Durable social license",
      condition: {
        community: ">=65",
        media: ">=55",
        investor: ">=55",
      },
      text:
        "Beacon showed that commercialization and local legitimacy can reinforce each other. By treating shared governance as part of the commercial package, you turned a siting risk into a trust asset.",
    },
    {
      name: "Host-community fracture",
      condition: {
        community: "<=30",
      },
      text:
        "Beacon moved the commercial story faster than the governance story, and the host community noticed. Once residents felt the real decisions were being made without them, commercialization began to look extractive rather than collaborative.",
    },
  ],
};
