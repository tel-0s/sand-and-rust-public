// Motive extensions for the quest blackboard: more reasons to cross the sand.
// verbs: 'retrieve' | 'kill'. {noun} fills from nouns.

export const MOTIVE_EXT = {
  mercantile: [
    {
      id: 'spoiled-deal', verb: 'kill',
      nouns: ['trade road', 'toll gap', 'shortcut'],
      pitch: 'something has set up shop on our {noun} and its prices are violence. undercut it. permanently.',
      midDesc: 'reopen the {noun}',
    },
    {
      id: 'appraisal', verb: 'retrieve',
      nouns: ['sample case', 'assay kit', 'sealed lot'],
      pitch: 'a buyer wants proof before coin. the {noun} is sitting out there with the proof inside. fetch it and we both eat this season.',
      midDesc: 'secure the {noun}',
    },
  ],
  monastic: [
    {
      id: 'broken-line', verb: 'kill',
      nouns: ['white line', 'pilgrim road', 'salt path'],
      pitch: 'something squats on the {noun} and pilgrims are choosing the long way, which is to say, some choose not to arrive. clear it. gently is not required.',
      midDesc: 'clear the {noun}',
    },
    {
      id: 'sealed-word', verb: 'retrieve',
      nouns: ['sealed breviary', 'abbot’s correspondence', 'rite-tablet'],
      pitch: 'an elder carried the {noun} out for safekeeping in worse times, and then became the worse times. bring it home. do not read it. you will read it. do not tell us.',
      midDesc: 'recover the {noun}',
    },
  ],
  scavver: [
    {
      id: 'stuck-rig', verb: 'retrieve',
      nouns: ['winch assembly', 'auger head', 'rig manifest'],
      pitch: 'our deep rig seized mid-bore and the {noun} is still down in the works. it’s paid for. the desert disagrees. persuade it.',
      midDesc: 'pull the {noun}',
    },
    {
      id: 'poacher', verb: 'kill',
      nouns: ['dig rights', 'marked seam', 'stake'],
      pitch: 'some machine has been working our {noun} at night. we don’t mind initiative. we mind unlicensed initiative.',
      midDesc: 'defend the {noun}',
    },
  ],
  ferrocult: [
    {
      id: 'wrong-note', verb: 'kill',
      nouns: ['chorus', 'seam of the dream', 'red verse'],
      pitch: 'something out there sings AGAINST the {noun}. deliberately. off-key on purpose. the dream cannot sleep for it. neither, frankly, can we.',
      midDesc: 'silence what mars the {noun}',
    },
    {
      id: 'offering', verb: 'retrieve',
      nouns: ['votive engine', 'listening jar', 'tithe of filings'],
      pitch: 'we left the {noun} out for the dream and the desert took it instead. an honest mistake on the desert’s part. correct it.',
      midDesc: 'reclaim the {noun}',
    },
  ],
};
