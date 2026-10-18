// Meet Team. Drop photos in public/team/ and point `photo` at them (square works best).
// Until a photo exists, the card shows a hand-drawn frame instead.

export type Member = { name: string; role: string; photo?: string; line?: string };

export const TEAM: Member[] = [
  { name: "teammate one", role: "UI + the tomato", photo: "/team/1.jpg" },
  { name: "teammate two", role: "backend + red pen", photo: "/team/2.jpg" },
  { name: "teammate three", role: "AI + handwriting", photo: "/team/3.jpg" },
  { name: "teammate four", role: "voice + sound", photo: "/team/4.jpg" },
];
