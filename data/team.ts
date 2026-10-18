// Meet Team: one group photo (public/team/team.jpg, metadata stripped) and the people in it.

export type Member = { name: string; role: string };

export const TEAM_PHOTO = "/team/team.jpg";

export const TEAM: Member[] = [
  { name: "Rajvir Ajmani", role: "CEO" },
  { name: "Arnav Bhattacharya", role: "COO" },
  { name: "Saiom Patro", role: "CTO" },
];
