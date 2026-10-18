// Meet Team. Drop photos in public/team/ and point `photo` at them (square works best).
// Until a photo exists, the card shows a hand-drawn frame instead.

export type Member = { name: string; role: string; photo?: string; line?: string };

export const TEAM: Member[] = [
  { name: "Rajvir Ajmani", role: "CEO", photo: "/team/rajvir.jpg" },
  { name: "Saiom Patro", role: "CTO", photo: "/team/saiom.jpg" },
  { name: "Arnav Bhattacharya", role: "COO", photo: "/team/arnav.jpg" },
];
