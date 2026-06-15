// Fitzpatrick-based quiz: each option carries a point value 1-6.
// Final type = rounded average across answers, clamped 1-6.

const QUIZ_QUESTIONS = [
  {
    text: "If you spent an hour in strong midday sun with no sunscreen, what would happen?",
    options: [
      { label: "I'd burn badly — red, painful, maybe blisters", value: 1 },
      { label: "I'd burn pretty easily and peel after", value: 2 },
      { label: "I might burn a little, then it fades into color", value: 3 },
      { label: "I rarely burn — I'd just get some color", value: 4 },
      { label: "I almost never burn", value: 5 },
    ]
  },
  {
    text: "How would you describe your natural, untanned skin tone?",
    options: [
      { label: "Very pale / fair, often with freckles", value: 1 },
      { label: "Light / fair", value: 2 },
      { label: "Medium / olive", value: 3 },
      { label: "Tan / brown", value: 4 },
      { label: "Dark brown / deep", value: 5 },
    ]
  },
  {
    text: "When you do tan, how does it usually go?",
    options: [
      { label: "I don't really tan — just burn or stay pale", value: 1 },
      { label: "Slowly, and only a little", value: 2 },
      { label: "Gradually, to a light brown", value: 3 },
      { label: "Pretty easily, to a deeper brown", value: 4 },
      { label: "Very easily and deeply", value: 5 },
    ]
  },
];

// Fitzpatrick type descriptions + sun behavior
const SKIN_TYPES = {
  1: {
    name: "Type I — Very Fair",
    desc: "Always burns, rarely tans. UV exposure should be short and cautious — self-tanner or fake tan is genuinely the better route for color, but if you do go outside, keep it brief and well-protected.",
    baseMinutes: { 3: 12, 4: 9, 5: 7, 6: 6, 7: 5, 8: 4, 9: 3, 10: 0, 11: 0 }
  },
  2: {
    name: "Type II — Fair",
    desc: "Burns easily, tans minimally. Build color gradually with short sessions and SPF — rushing it just means peeling, not a better tan.",
    baseMinutes: { 3: 20, 4: 16, 5: 13, 6: 11, 7: 9, 8: 7, 9: 5, 10: 3, 11: 0 }
  },
  3: {
    name: "Type III — Medium",
    desc: "Burns sometimes, tans steadily to a light-medium brown. This is the sweet-spot skin type for UV tanning — moderate sessions with SPF give consistent results.",
    baseMinutes: { 3: 28, 4: 23, 5: 19, 6: 16, 7: 13, 8: 11, 9: 8, 10: 5, 11: 3 }
  },
  4: {
    name: "Type IV — Olive",
    desc: "Burns minimally, tans easily to a deeper brown. You can handle longer sessions, but cumulative UV damage still adds up — SPF still matters.",
    baseMinutes: { 3: 38, 4: 32, 5: 27, 6: 23, 7: 19, 8: 16, 9: 12, 10: 8, 11: 5 }
  },
  5: {
    name: "Type V — Brown",
    desc: "Rarely burns, tans deeply and quickly. Your safe windows are long, but high-UV days still carry real damage risk over time.",
    baseMinutes: { 3: 50, 4: 42, 5: 36, 6: 31, 7: 26, 8: 22, 9: 17, 10: 12, 11: 8 }
  },
  6: {
    name: "Type VI — Deep",
    desc: "Almost never burns, deep natural pigmentation. UV exposure changes color the least of any skin type — but skin health protection (SPF, hydration) still matters regardless of visible burn.",
    baseMinutes: { 3: 60, 4: 55, 5: 48, 6: 42, 7: 36, 8: 30, 9: 24, 10: 18, 11: 12 }
  },
};
