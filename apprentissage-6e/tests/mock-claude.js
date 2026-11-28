// Faux serveur « API Claude » pour tester la chaîne IA sans clé ni coût.
// Usage : node tests/mock-claude.js  (port 3999), puis lancer le serveur avec
//   ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:3999 npm start
import http from 'node:http';

const ex = [
  { type: 'qcm', question: 'Quelle phrase contient un COD ?', choices: ['Il dort.', 'Il mange une pomme.', 'Il est content.'], answer: 1, hint: 'Pose la question « quoi ? » après le verbe.', explanation: '« une pomme » répond à « mange quoi ? » : c’est un COD.', notion: 'COD' },
  { type: 'trous', question: 'Complète.', text: 'Les enfants ___ (jouer) dehors.', answers: [['jouent']], choices: [], hint: 'Le sujet est au pluriel.', explanation: 'Ils jouent : 3e personne du pluriel.', notion: 'Accord sujet-verbe' },
  { type: 'ordre', question: 'Remets dans l’ordre.', items: ['Le', 'chat', 'dort'], hint: 'Sujet puis verbe.', explanation: 'Le chat dort.', notion: 'Phrase' },
  { type: 'identification', question: 'Clique sur le verbe.', tokens: ['Le', 'chien', 'aboie.'], targets: [2], hint: 'Change le temps.', explanation: '« aboie » se conjugue.', notion: 'Verbe' },
  { type: 'vraifaux', question: 'Vrai ou faux ?', statement: '« rapide » est un adjectif.', answer: true, justifications: ['Il qualifie un nom.', 'Il se conjugue.', 'Il est invariable.'], justificationAnswer: 0, hint: 'Que fait ce mot ?', explanation: 'Un adjectif qualifie un nom.', notion: 'Nature' },
  { type: 'qcm', question: 'Exercice invalide (réponse hors limites)', choices: ['a', 'b'], answer: 5, hint: 'x', explanation: 'x', notion: 'x' },
];

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const b = JSON.parse(body || '{}');
    const props = b.output_config?.format?.schema?.properties || {};
    console.log('[mock] %s model=%s effort=%s schema=%s fallbacks=%s beta=%s', req.url, b.model, b.output_config?.effort,
      Object.keys(props).join(','), JSON.stringify(b.fallbacks), req.headers['anthropic-beta']);
    let payload;
    if (props.lesson) {
      payload = { title: 'Les fractions', emoji: '🍕', summary: 'Comprendre les fractions simples.', lesson: { intro: 'Une **fraction** partage un tout.', rules: [{ title: 'Numérateur', text: 'Le nombre du haut.', examples: ['3/4 : 3 parts'] }], pitfalls: ['Le dénominateur ne vaut jamais 0.'], tip: 'Pense à une pizza !' }, exercises: ex };
    } else if (props.passage) {
      payload = { passageTitle: 'Le petit dragon', passage: 'Il était une fois un petit dragon.\nIl crachait des bulles.', exercises: ex };
    } else {
      payload = { exercises: ex };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg_mock', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null,
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      usage: { input_tokens: 10, output_tokens: 10 },
    }));
  });
}).listen(3999, '127.0.0.1', () => console.log('mock Claude API sur :3999'));
