// CalVer + named arcs. Public, continuous development has no meaningful
// "1.0" — the desert just keeps growing. Bump BUILD each push; name each arc.
//
// FORMAT: year.month.buildCounter — 2026.7.18 is the EIGHTEENTH BUILD of
// July 2026, not July 18th. (A month ships as many builds as it ships;
// some days ship five.) LABEL renders it unmistakably for humans.
export const BUILD = '2026.7.117';
export const ARC = 'The Colossi';
const [y, m, b] = BUILD.split('.');
export const LABEL = `${y}.${m} · build ${b}`;
