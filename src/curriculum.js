// src/curriculum.js
// Deterministic, high-variety, NAPLAN-style (original) MCQ question bank.
// Compatible with quiz.js expectations: domain, difficulty(1..5), type:'mcq', prompt, choices[4], correctAnswer. [file:122]

/* -------------------------
   Utilities (deterministic)
   ------------------------- */

function makeId(prefix, level, n) {
  return `${prefix}-L${level}-${String(n).padStart(4, "0")}`;
}

function seedFromString(str) {
  // FNV-1a-ish hash -> uint32
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, arr) {
  return arr[randInt(rng, 0, arr.length - 1)];
}

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function makeQuestion({
  id,
  domain,
  subskill,
  difficulty,
  prompt,
  choices,
  correctAnswer,
  hint = "",
  explanation = "",
}) {
  return {
    id,
    domain,
    subskill,
    difficulty,
    type: "mcq",
    prompt,
    choices,
    correctAnswer,
    hint,
    explanation,
  };
}

// Always return 4 UNIQUE choices, with correctAnswer included.
function buildChoices(rng, correct, distractors, extraCandidateFn) {
  const correctStr = String(correct);

  const set = new Set();
  set.add(correctStr);

  for (const d of distractors || []) {
    if (set.size >= 4) break;
    const s = String(d);
    if (s !== correctStr) set.add(s);
  }

  // Generate extra unique distractors if needed
  let guard = 0;
  while (set.size < 4 && guard++ < 50) {
    const candidate = extraCandidateFn ? String(extraCandidateFn(set, correctStr)) : "";
    if (candidate && candidate !== correctStr) set.add(candidate);
  }

  // Final hard pad (should never be needed, but makes tests bulletproof)
  let k = 1;
  while (set.size < 4) {
    const candidate = `${correctStr} (${k++})`;
    if (!set.has(candidate)) set.add(candidate);
  }

  const choices = shuffle(rng, Array.from(set)).slice(0, 4);

  // Ensure correct is present after shuffle/slice
  if (!choices.includes(correctStr)) {
    choices[randInt(rng, 0, 3)] = correctStr;
    // If that introduced a duplicate, fix it
    const fixed = uniq(choices);
    if (fixed.length !== 4) {
      // Replace duplicates with generated candidates
      const used = new Set(fixed);
      while (fixed.length < 4) {
        const candidate = extraCandidateFn ? String(extraCandidateFn(used, correctStr)) : `${correctStr}-${fixed.length}`;
        if (candidate !== correctStr && !used.has(candidate)) {
          used.add(candidate);
          fixed.push(candidate);
        }
      }
      return { choices: shuffle(rng, fixed).slice(0, 4), correctAnswer: correctStr };
    }
  }

  return { choices, correctAnswer: correctStr };
}

/* -------------------------
   NUMERACY (600 total)
   120 per level (6 families x 20)
   Subskills >= 6
   ------------------------- */

function genNumeracyLevel(level) {
  const out = [];
  const rng = mulberry32(seedFromString(`numeracy-L${level}`));
  let n = 1;

  const ranges = {
    1: { min: 0, max: 20 },
    2: { min: 5, max: 50 },
    3: { min: 10, max: 100 },
    4: { min: 20, max: 200 },
    5: { min: 50, max: 500 },
  };

  function qAddSub(i) {
    const { min, max } = ranges[level];
    const a = randInt(rng, min, max);
    const b = randInt(rng, min, max);
    const op = pick(rng, ["+", "−"]);
    const big = Math.max(a, b);
    const small = Math.min(a, b);

    const correct = op === "+" ? a + b : big - small;
    const prompt = op === "+" ? `What is ${a} + ${b}?` : `What is ${big} − ${small}?`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      correct,
      [correct + 1, correct - 1, correct + 2, correct - 2],
      (set, c) => {
        const cc = parseInt(c, 10);
        const delta = pick(rng, [3, 4, 5, 6, 7]);
        const sign = pick(rng, [1, -1]);
        const v = cc + sign * delta;
        return v < 0 ? cc + delta : v;
      }
    );

    return makeQuestion({
      id: makeId("q-num-addsub", level, n++),
      domain: "numeracy",
      subskill: "num-add-sub",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Work step by step.",
      explanation: "Use number facts and check your answer makes sense.",
    });
  }

  function qPatterns(i) {
    const step = level <= 2 ? pick(rng, [2, 3, 5]) : pick(rng, [2, 3, 4, 5, 10, 20]);
    const start = randInt(rng, 1, level <= 2 ? 30 : 80);
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const correct = start + 4 * step;

    const prompt =
      `Here is a number pattern:\n` +
      `${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ?\n` +
      `What is the next number?`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      correct,
      [correct + step, correct - step, correct + 1, correct - 1],
      (set, c) => parseInt(c, 10) + pick(rng, [step + 2, step + 3, step + 4])
    );

    return makeQuestion({
      id: makeId("q-num-pattern", level, n++),
      domain: "numeracy",
      subskill: "num-patterns",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Look at what is added each time.",
      explanation: `This pattern increases by ${step}.`,
    });
  }

  function qPlaceValue(i) {
    const max =
      level === 1 ? 99 : level === 2 ? 199 : level === 3 ? 999 : level === 4 ? 1999 : 9999;
    const num = randInt(rng, Math.floor(max / 4), max);

    const ask = pick(rng, level <= 2 ? ["ones", "tens"] : ["ones", "tens", "hundreds"]);
    const s = String(num).padStart(3, "0");
    const digit =
      ask === "ones" ? s[s.length - 1] : ask === "tens" ? s[s.length - 2] : s[s.length - 3];

    const prompt = `In the number ${num}, what digit is in the ${ask} place?`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      digit,
      shuffle(rng, ["0","1","2","3","4","5","6","7","8","9"].filter((d) => d !== digit)).slice(0, 3),
      (set, c) => String(randInt(rng, 0, 9))
    );

    return makeQuestion({
      id: makeId("q-num-place", level, n++),
      domain: "numeracy",
      subskill: "num-place-value",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Ones is the last digit, tens is the second-last.",
      explanation: "Place value tells you what a digit represents.",
    });
  }

  function qTimeLanguage(i) {
    const times = [
      { t: "3:15", w: "quarter past three" },
      { t: "3:30", w: "half past three" },
      { t: "3:45", w: "quarter to four" },
      { t: "6:15", w: "quarter past six" },
      { t: "7:30", w: "half past seven" },
      { t: "8:45", w: "quarter to nine" },
      { t: "12:00", w: "twelve o’clock" },
    ];

    const item = pick(rng, times);
    const prompt = `Which words match the time ${item.t}?`;
    const wrong = shuffle(rng, times.map((x) => x.w).filter((w) => w !== item.w)).slice(0, 3);

    const { choices, correctAnswer } = buildChoices(
      rng,
      item.w,
      wrong,
      (set, c) => pick(rng, times.map((x) => x.w))
    );

    return makeQuestion({
      id: makeId("q-num-time", level, n++),
      domain: "numeracy",
      subskill: "num-time",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Quarter past is :15, half past is :30, quarter to is :45.",
      explanation: `${item.t} is said as "${item.w}".`,
    });
  }

  function qMoney(i) {
    const prices = ["0.50","0.80","1.20","1.50","2.00","2.40","3.10","3.50","4.20","4.80","5.60"];
    const a = parseFloat(pick(rng, prices));
    const b = parseFloat(pick(rng, prices));
    const total = +(a + b).toFixed(2);

    const pay = pick(rng, level <= 2 ? [5, 10] : level <= 4 ? [10, 20] : [20, 50]);
    const change = +(pay - total).toFixed(2);

    const prompt =
      `A drink costs $${a.toFixed(2)} and a snack costs $${b.toFixed(2)}.\n` +
      `A student pays with $${pay}.\n` +
      `How much change should they get?`;

    const correct = `$${change.toFixed(2)}`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      correct,
      [
        `$${(change + 1).toFixed(2)}`,
        `$${(change - 1).toFixed(2)}`,
        `$${(pay - a).toFixed(2)}`,
        `$${(pay - b).toFixed(2)}`,
      ],
      (set, c) => {
        const cc = parseFloat(c.replace("$", ""));
        const v = +(cc + pick(rng, [0.5, 1, 1.5, 2, -0.5, -1])).toFixed(2);
        return `$${Math.max(0, v).toFixed(2)}`;
      }
    );

    return makeQuestion({
      id: makeId("q-num-money", level, n++),
      domain: "numeracy",
      subskill: "num-money",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Add the prices first, then subtract from the amount paid.",
      explanation: "Change = amount paid − total cost.",
    });
  }

  function qFractions(i) {
    // Keep it simple and guarantee integer answers (no floor)
    const denom = pick(rng, level <= 2 ? [2, 4] : [2, 3, 4]);
    const fracName = denom === 2 ? "half" : denom === 3 ? "third" : "quarter";

    // choose a whole that is a multiple of denom
    const k = randInt(rng, 2, level <= 2 ? 12 : level <= 4 ? 20 : 30);
    const whole = k * denom;
    const part = whole / denom;

    const prompt = `What is one ${fracName} of ${whole}?`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      part,
      [part + 1, part - 1, whole, part + denom],
      (set, c) => {
        const cc = parseInt(c, 10);
        const candidate = cc + pick(rng, [2, 3, 4, 5, 6]) * (pick(rng, [1, -1]));
        return candidate <= 0 ? cc + 2 : candidate;
      }
    );

    return makeQuestion({
      id: makeId("q-num-frac", level, n++),
      domain: "numeracy",
      subskill: "num-fractions",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: `Divide by ${denom}.`,
      explanation: `One ${fracName} means split into ${denom} equal parts.`,
    });
  }

  const families = [qAddSub, qPatterns, qPlaceValue, qTimeLanguage, qMoney, qFractions];
  for (const fam of families) for (let i = 0; i < 20; i++) out.push(fam(i));
  return out; // 120
}

function genNumeracy() {
  const all = [];
  for (let level = 1; level <= 5; level++) all.push(...genNumeracyLevel(level));
  return all; // 600
}

/* -------------------------
   READING (600 total)
   120 per level (6 families x 20)
   Prompts are naturally unique (many combinations).
   ------------------------- */

function genReadingLevel(level) {
  const out = [];
  const rng = mulberry32(seedFromString(`reading-L${level}`));
  let n = 1;

  const names = ["Alex", "Mina", "Jack", "Sam", "Rani", "Tara", "Lily", "Ethan", "Georgia", "Noah"];
  const places = ["the park", "the library", "the beach", "the backyard", "school", "the sports oval"];
  const objects = ["a shiny shell", "a new book", "a missing lunchbox", "a tiny robot", "a secret note", "a torn map"];
  const animals = ["cat", "dog", "rabbit", "bird", "lizard", "koala"];
  const topics = ["bamboo", "seahorses", "microbats", "rainforests", "recycling", "volcanoes", "gardens", "rainbows"];

  const vocab = [
    { w: "swift", m: "very fast", wrong: ["very slow", "very loud", "very small"] },
    { w: "fragile", m: "easy to break", wrong: ["very strong", "very heavy", "very noisy"] },
    { w: "ancient", m: "very old", wrong: ["very new", "very shiny", "very wet"] },
    { w: "curious", m: "wanting to learn", wrong: ["not interested", "very tired", "very hungry"] },
    { w: "cheerful", m: "very happy", wrong: ["very sad", "very angry", "very scared"] },
    { w: "determined", m: "decided and not giving up", wrong: ["not sure", "very sleepy", "not careful"] },
  ];

  function shortDetail(i) {
    const who = pick(rng, names);
    const where = pick(rng, places);
    const when = pick(rng, ["after school", "on Saturday", "early in the morning", "before dinner"]);
    const found = pick(rng, objects);

    const text =
      `Read this:\n` +
      `${who} went to ${where} ${when}. ` +
      `${who} found ${found} and showed it to a friend.`;

    const prompt = `${text}\n\nWhat did ${who} find?`;

    const distractors = shuffle(rng, objects.filter((x) => x !== found)).slice(0, 3);
    const { choices, correctAnswer } = buildChoices(rng, found, distractors, (set, c) => pick(rng, objects));

    return makeQuestion({
      id: makeId("q-read-detail", level, n++),
      domain: "reading",
      subskill: "read-detail",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Look for the exact words in the text.",
      explanation: "A detail question is answered directly by the text.",
    });
  }

  function shortInference(i) {
    const who = pick(rng, names);
    const pet = pick(rng, animals);
    const spot = pick(rng, ["behind the couch", "under the bed", "inside the cupboard", "near the fence"]);
    const mood = pick(rng, ["relieved", "excited", "worried", "surprised"]);

    const text =
      `Read this:\n` +
      `${who} searched everywhere for their ${pet}. ` +
      `Then ${who} heard a soft sound from ${spot}. ` +
      `${who} smiled and gently reached out.`;

    const prompt = `${text}\n\nHow is ${who} most likely feeling at the end?`;
    const correct = "relieved";

    const wrongPool = ["angry", "bored", "confused", "sleepy", "disappointed", mood].filter((x) => x !== correct);
    const distractors = shuffle(rng, wrongPool).slice(0, 3);

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => pick(rng, wrongPool));

    return makeQuestion({
      id: makeId("q-read-infer", level, n++),
      domain: "reading",
      subskill: "read-inference",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Use clues from what happened.",
      explanation: "Inference means using clues to work something out.",
    });
  }

  function vocabContext(i) {
    const item = pick(rng, vocab);
    const noun = pick(rng, ["runner", "puppy", "robot", "tree", "storm", "bicycle", "magician"]);
    const sentence = `Read: "The ${item.w} ${noun} kept going."`;
    const prompt = `${sentence}\n\nWhat does "${item.w}" mean?`;

    const { choices, correctAnswer } = buildChoices(
      rng,
      item.m,
      item.wrong,
      (set, c) => pick(rng, ["very bright", "very old", "very quiet", "very rough"])
    );

    return makeQuestion({
      id: makeId("q-read-vocab", level, n++),
      domain: "reading",
      subskill: "read-vocab",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Use the sentence to help you.",
      explanation: `"${item.w}" means ${item.m}.`,
    });
  }

  function mainIdea(i) {
    const topic = pick(rng, topics);
    const heading = pick(rng, ["Did You Know?", "Nature Notes", "Quick Facts", "Amazing Things"]);
    const s1 = `${topic[0].toUpperCase() + topic.slice(1)} can be surprising.`;
    const s2 = pick(rng, [
      `This text shares facts about ${topic}.`,
      `This text explains why ${topic} are important.`,
      `This text gives examples and details about ${topic}.`,
    ]);
    const s3 = pick(rng, [
      "It uses short sentences to help the reader learn.",
      "It includes details to help the reader understand.",
      "It gives examples to explain the topic.",
    ]);

    const text = `${heading}\n${s1} ${s2} ${s3}`;
    const prompt = `Read this:\n${text}\n\nWhat is the main idea of the text?`;

    const correct = `Facts about ${topic}`;
    const distractors = [
      "How to cook dinner",
      "A funny story about a party",
      "Rules for a sport",
    ];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => "A list of numbers");

    return makeQuestion({
      id: makeId("q-read-main", level, n++),
      domain: "reading",
      subskill: "read-main-idea",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Main idea = what the text is mostly about.",
      explanation: "The text keeps talking about the same topic.",
    });
  }

  function miniMagazineDetail(i) {
    const heading = pick(rng, ["Amazing Animals", "Outdoor Facts", "Science Snapshot", "Nature News"]);
    const topic = pick(rng, topics);
    const factA = pick(rng, [
      `Some ${topic} live near water.`,
      `Some ${topic} can be found in warm places.`,
      `Some ${topic} live where they can stay hidden.`,
    ]);
    const factB = pick(rng, [
      `They have features that help them survive.`,
      `They can be useful in different ways.`,
      `People can learn from studying them.`,
    ]);
    const factC = pick(rng, [
      `This helps them stay safe.`,
      `This helps them find food.`,
      `This helps them move around.`,
    ]);

    const text = `${heading}\n${factA} ${factB} ${factC}`;
    const question = `According to the text, what helps ${topic} survive?`;

    const correct = "Their features";
    const distractors = ["Magic", "Luck", "Their favourite colour"];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => "Their toys");

    return makeQuestion({
      id: makeId("q-read-mini-detail", level, n++),
      domain: "reading",
      subskill: "read-detail-mini",
      difficulty: level,
      prompt: `Read this mini-magazine text:\n${text}\n\n${question}`,
      choices,
      correctAnswer,
      hint: "Find the sentence that matches the question.",
      explanation: "The text explains survival using features.",
    });
  }

  function authorPurpose(i) {
    const topic = pick(rng, topics);
    const prompt =
      `Read this:\n` +
      `This text explains ${topic} and gives examples.\n\n` +
      `What is the author’s purpose?`;

    const correct = "To give information";
    const distractors = ["To tell a joke", "To persuade the reader", "To describe a game"];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => "To teach a dance");

    return makeQuestion({
      id: makeId("q-read-purpose", level, n++),
      domain: "reading",
      subskill: "read-author-purpose",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Is the text informing, persuading, or entertaining?",
      explanation: "It explains and gives examples, so it is informative.",
    });
  }

  const families = [shortDetail, shortInference, vocabContext, mainIdea, miniMagazineDetail, authorPurpose];
  for (const fam of families) for (let i = 0; i < 20; i++) out.push(fam(i));
  return out; // 120
}

function genReading() {
  const all = [];
  for (let level = 1; level <= 5; level++) all.push(...genReadingLevel(level));
  return all; // 600
}

/* -------------------------
   CONVENTIONS (600 total)
   120 per level (6 families x 20)
   Prompts include sentence context -> uniqueness high.
   ------------------------- */

function genConventionsLevel(level) {
  const out = [];
  const rng = mulberry32(seedFromString(`conventions-L${level}`));
  let n = 1;

  const names = ["Georgia", "Alex", "Mina", "Jack", "Sam", "Rani", "Tara", "Lily", "Ethan"];
  const places = ["the park", "the library", "school", "the beach", "the backyard"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const animals = ["dog", "cat", "rabbit", "bird", "lizard", "koala"];
  const objects = ["backpack", "lunchbox", "helmet", "notebook", "towel", "sandwich", "pencil"];

  const spellingBank = [
    { correct: "because", wrong: ["becaus", "becouse", "becuase"] },
    { correct: "friend", wrong: ["freind", "frend", "friand"] },
    { correct: "school", wrong: ["skool", "scool", "schol"] },
    { correct: "exactly", wrong: ["exatly", "exactley", "exectly"] },
    { correct: "probably", wrong: ["probly", "proberly", "probabaly"] },
    { correct: "beautiful", wrong: ["beutiful", "beautifull", "butiful"] },
    { correct: "minute", wrong: ["minit", "minuite", "minut"] },
    { correct: "basket", wrong: ["baskit", "bascket", "baskett"] },
  ];

  function spellingInContext(i) {
    const item = pick(rng, spellingBank);
    const who = pick(rng, names);
    const obj = pick(rng, objects);
    const wrongWord = pick(rng, item.wrong);

    const sentence = `"${who} looked in the ${obj} ${wrongWord} it was missing."`;
    const prompt = `Read this sentence:\n${sentence}\n\nWhich spelling is correct?`;

    const { choices, correctAnswer } = buildChoices(rng, item.correct, item.wrong, (set, c) => pick(rng, item.wrong));

    return makeQuestion({
      id: makeId("q-conv-spell", level, n++),
      domain: "conventions",
      subskill: "conv-spelling",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Look for common spelling patterns.",
      explanation: `The correct spelling is "${item.correct}".`,
    });
  }

  function capitals(i) {
    const who = pick(rng, names);
    const day = pick(rng, days);
    const place = pick(rng, places);

    const base = `on ${day.toLowerCase()} ${who.toLowerCase()} went to ${place}.`;
    const correct = `On ${day} ${who} went to ${place}.`;

    const distractors = [
      `On ${day.toLowerCase()} ${who} went to ${place}.`,
      `on ${day} ${who} went to ${place}.`,
      `ON ${day} ${who} went to ${place}.`,
    ];

    const prompt = `Which sentence uses capital letters correctly?\n"${base}"`;

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => `On ${day} ${who} Went to ${place}.`);

    return makeQuestion({
      id: makeId("q-conv-cap", level, n++),
      domain: "conventions",
      subskill: "conv-capitals",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Names and days start with a capital letter.",
      explanation: "Use capitals for proper nouns and the first word of a sentence.",
    });
  }

  function punctuation(i) {
    const who = pick(rng, names);
    const kind = pick(rng, ["question", "exclaim"]);
    const raw = kind === "question" ? `${who} asked do you want to play` : `what a fantastic day said ${who}`;

    const correct =
      kind === "question"
        ? `${who} asked, "Do you want to play?"`
        : `"What a fantastic day!" said ${who}.`;

    const wrong =
      kind === "question"
        ? [
            `${who} asked, "Do you want to play."`,
            `${who} asked "Do you want to play"?`,
            `${who} asked, Do you want to play?`,
          ]
        : [
            `"What a fantastic day" said ${who}!`,
            `"What a fantastic day!" said ${who}`,
            `What a fantastic day! said ${who}.`,
          ];

    const prompt = `Which sentence is punctuated correctly?\n${raw}`;

    const { choices, correctAnswer } = buildChoices(rng, correct, wrong, (set, c) => `${who} asked, "Do you want to play"!`);

    return makeQuestion({
      id: makeId("q-conv-punct", level, n++),
      domain: "conventions",
      subskill: "conv-punctuation",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Questions need a question mark.",
      explanation: "Punctuation helps the reader understand meaning.",
    });
  }

  function grammar(i) {
    const who = pick(rng, names);
    const pet = pick(rng, animals);
    const place = pick(rng, places);

    const mode = pick(rng, level <= 2 ? ["agreement", "tense"] : ["agreement", "tense", "either"]);
    let prompt, correct, distractors;

    if (mode === "agreement") {
      prompt = `Which is a correct sentence?`;
      correct = `${who}'s ${pet} is at ${place}.`;
      distractors = [
        `${who}'s ${pet} are at ${place}.`,
        `${who}'s ${pet} am at ${place}.`,
        `${who}'s ${pet} be at ${place}.`,
      ];
    } else if (mode === "tense") {
      prompt = `Which sentence is written in the past tense?`;
      correct = `${who} walked to ${place}.`;
      distractors = [
        `${who} walks to ${place}.`,
        `${who} will walk to ${place}.`,
        `${who} is walking to ${place}.`,
      ];
    } else {
      prompt = `Which sentence is correct?`;
      correct = `${who} took a hat and a towel to ${place}.`;
      distractors = [
        `${who} took a hat or a towel to ${place}.`,
        `${who} take a hat and a towel to ${place}.`,
        `${who} took a hat and towel to to ${place}.`,
      ];
    }

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => `${who} walkeded to ${place}.`);

    return makeQuestion({
      id: makeId("q-conv-gram", level, n++),
      domain: "conventions",
      subskill: "conv-grammar",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Read each option aloud to see what sounds correct.",
      explanation: "Correct sentences use the right verb form and grammar.",
    });
  }

  function prepositions(i) {
    const who = pick(rng, names);
    const obj = pick(rng, objects);
    const surface = pick(rng, ["the table", "the shelf", "the chair", "the bed"]);

    const templates = [
      { s: `${who} put the ${obj} ___ ${surface}.`, correct: "on", wrong: ["in", "for", "around"] },
      { s: `${who} waited ___ the bus to arrive.`, correct: "for", wrong: ["around", "to", "as"] },
      { s: `${who} walked ___ school with a friend.`, correct: "to", wrong: ["of", "as", "since"] },
    ];
    const t = pick(rng, templates);

    const prompt = `Which word completes this sentence correctly?\n${t.s}`;

    const { choices, correctAnswer } = buildChoices(rng, t.correct, t.wrong, (set, c) => "under");

    return makeQuestion({
      id: makeId("q-conv-prep", level, n++),
      domain: "conventions",
      subskill: "conv-prepositions",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Try each word in the sentence.",
      explanation: `The correct word is "${t.correct}".`,
    });
  }

  function partsOfSpeech(i) {
    const who = pick(rng, names);
    const pet = pick(rng, animals);
    const action = pick(rng, ["ran", "jumped", "laughed", "whispered", "watched", "climbed"]);
    const place = pick(rng, places);
    const adj = pick(rng, ["blue", "tiny", "cheerful", "noisy", "sleepy", "brave"]);

    const sentence = `${who} ${action} with the ${adj} ${pet} at ${place}.`;
    const ask = pick(rng, ["noun", "adjective", "verb"]);
    const prompt = `In this sentence, which word is a ${ask}?\n${sentence}`;

    let correct, distractors;
    if (ask === "noun") {
      correct = pet;
      distractors = [who, action, adj];
    } else if (ask === "adjective") {
      correct = adj;
      distractors = [who, action, pet];
    } else {
      correct = action;
      distractors = [who, adj, pet];
    }

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, (set, c) => "quickly");

    return makeQuestion({
      id: makeId("q-conv-pos", level, n++),
      domain: "conventions",
      subskill: "conv-parts-of-speech",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Noun = naming word, verb = doing word, adjective = describing word.",
      explanation: `The correct answer is "${correct}".`,
    });
  }

  const families = [spellingInContext, capitals, punctuation, grammar, prepositions, partsOfSpeech];
  for (const fam of families) for (let i = 0; i < 20; i++) out.push(fam(i));
  return out; // 120
}

function genConventions() {
  const all = [];
  for (let level = 1; level <= 5; level++) all.push(...genConventionsLevel(level));
  return all; // 600
}

/* -------------------------
   WRITING (600 total)
   120 per level (6 families x 20)
   ------------------------- */

function genWritingLevel(level) {
  const out = [];
  const rng = mulberry32(seedFromString(`writing-L${level}`));
  let n = 1;

  // Bigger pools => more prompt uniqueness
  const characters = [
    "Alex","Mina","Jack","Sam","Rani","Tara","Lily","Ethan","Georgia","Noah","Ava","Kai",
    "Zoe","Mia","Ben","Chloe","Aria","Leo"
  ];

  const settings = [
    "at the beach","in the rainforest","at the zoo","at the park","in a quiet town","at a campsite",
    "near a creek","at the library","behind the school hall","on a bushwalk","at a market",
    "near an old shed","in a museum","at a train station","in the backyard"
  ];

  const objects = [
    "a mysterious box","a shiny key","a torn map","a strange footprint","a tiny robot","a secret message",
    "an old compass","a locked diary","a folded note","a broken watch","a silver coin","a lantern",
    "a pair of goggles","a small whistle","a glass marble","a wooden badge","a painted stone","a puzzle piece"
  ];

  const moods = ["excited","nervous","curious","proud","surprised","brave","worried","hopeful","confused","determined"];
  const times = ["early in the morning","after school","just before dinner","on Saturday","at sunset","in the middle of the night"];
  const sounds = ["a creak","a whisper","a soft thud","a clang","a rustle","a splash","a tap-tap-tap"];

  function storyContext() {
    const who = pick(rng, characters);
    const where = pick(rng, settings);
    const when = pick(rng, times);
    const obj = pick(rng, objects);
    const mood = pick(rng, moods);
    const sound = pick(rng, sounds);

    // Context changes per question => prompt uniqueness skyrockets
    return (
      `Story:\n` +
      `${who} was ${where} ${when}. ` +
      `${who} felt ${mood} after hearing ${sound} and noticing ${obj}.`
    );
  }

  function nextSentence() {
    const ctx = storyContext();
    const prompt =
      `${ctx}\n\n` +
      `Which sentence is the best next sentence?`;

    const correct = "I took a slow breath, then moved closer to see what was really happening.";
    const distractors = [
      "I ate a sandwich and forgot about it.",
      "My shoes were blue and my hat was red.",
      "Yesterday is a day that happened."
    ];

    const { choices, correctAnswer } = buildChoices(
      rng,
      correct,
      distractors,
      () => "I looked around carefully and tried to stay calm."
    );

    return makeQuestion({
      id: makeId("q-write-next", level, n++),
      domain: "writing",
      subskill: "write-next",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "The best next sentence continues the action or mystery.",
      explanation: "Good stories connect to what just happened."
    });
  }

  function bestDescription() {
    const ctx = storyContext();
    const thing = pick(rng, ["storm","treehouse","bike","river","cave","puppy","lantern","path","ocean","forest"]);

    const prompt =
      `${ctx}\n\n` +
      `Which sentence describes the ${thing} best?`;

    const correct = pick(rng, [
      `The ${thing} looked ordinary at first, but tiny details made it seem unusual.`,
      `The ${thing} was cold to touch and made my fingers tingle.`,
      `The ${thing} stood out like it belonged to a different story.`
    ]);

    const distractors = [
      `The ${thing} was nice.`,
      `The ${thing} was good.`,
      `The ${thing} was there.`
    ];

    const { choices, correctAnswer } = buildChoices(
      rng,
      correct,
      distractors,
      () => `The ${thing} was okay.`
    );

    return makeQuestion({
      id: makeId("q-write-desc", level, n++),
      domain: "writing",
      subskill: "write-description",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Good descriptions use specific details.",
      explanation: "Specific details help the reader picture the scene."
    });
  }

  function strongerVerb() {
    const who = pick(rng, characters);
    const place = pick(rng, settings);
    const prompt =
      `Story:\n${who} was ${place}.\n\n` +
      `Choose the strongest verb to complete this sentence:\n` +
      `"The door ___ open."`;

    const strong = level >= 4 ? ["creaked", "slammed", "burst", "swung"] : ["creaked", "opened", "moved", "swung"];
    const correct = pick(rng, strong);
    const distractors = level >= 4 ? ["did", "went", "was"] : ["did", "was", "got"];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, () => "made");

    return makeQuestion({
      id: makeId("q-write-verb", level, n++),
      domain: "writing",
      subskill: "write-verbs",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Strong verbs make writing clearer and more vivid.",
      explanation: `"${correct}" creates a stronger picture in the reader’s mind.`
    });
  }

  function betterOpening() {
    const who = pick(rng, characters);
    const where = pick(rng, settings);
    const mood = pick(rng, moods);

    const prompt =
      `Theme:\nA story about ${who} who feels ${mood} ${where}.\n\n` +
      `Which is the best opening sentence for a story?`;

    const correct = pick(rng, [
      `I froze when I realised the quiet was not normal.`,
      `Something small changed, and suddenly everything felt different.`,
      `Just as I turned around, I saw something I could not explain.`,
      `I did not know it yet, but this was the moment everything began.`
    ]);

    const distractors = [
      "I woke up.",
      "It was a day.",
      "I did something."
    ];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, () => "I went outside.");

    return makeQuestion({
      id: makeId("q-write-open", level, n++),
      domain: "writing",
      subskill: "write-openings",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "A strong opening creates curiosity.",
      explanation: "Good openings make the reader want to keep reading."
    });
  }

  function fixRunOn() {
    const who = pick(rng, characters);
    const where = pick(rng, settings);
    const obj = pick(rng, objects);

    const runOn =
      `${who} ran to ${where} and ${who.toLowerCase()} picked up ${obj} and ` +
      `${who.toLowerCase()} tried to hide it and ${who.toLowerCase()} felt nervous.`;

    const prompt =
      `Read this run-on sentence:\n` +
      `"${runOn}"\n\n` +
      `Which option fixes it best?`;

    const correct = `${who} ran to ${where}, picked up ${obj}, and tried to hide it.`;
    const distractors = [
      `${who} ran to ${where} picked up ${obj} and tried to hide it.`,
      `${who} ran to ${where}, picked up ${obj} tried to hide it.`,
      `${who} ran to ${where} and, picked up ${obj}, and tried to hide it.`
    ];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, () => `${who} ran to ${where}.`);

    return makeQuestion({
      id: makeId("q-write-runon", level, n++),
      domain: "writing",
      subskill: "write-sentences",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "Split long ideas into clear parts using punctuation and conjunctions.",
      explanation: "The best option removes repetition and adds clear punctuation."
    });
  }

  function bestEnding() {
    const ctx = storyContext();
    const obj = pick(rng, objects);

    const prompt =
      `${ctx}\n\n` +
      `A story ends like this:\n` +
      `"I took a deep breath and opened ${obj}."\n\n` +
      `Which ending is best?`;

    const correct = 'Inside was a note that said, "Well done. You found me."';
    const distractors = [
      "Then I went to sleep.",
      "Inside was nothing and that was it.",
      "I ate an apple and forgot about it."
    ];

    const { choices, correctAnswer } = buildChoices(rng, correct, distractors, () => "I closed it quickly and ran.");

    return makeQuestion({
      id: makeId("q-write-end", level, n++),
      domain: "writing",
      subskill: "write-endings",
      difficulty: level,
      prompt,
      choices,
      correctAnswer,
      hint: "A good ending connects to the story’s problem or mystery.",
      explanation: "A satisfying ending answers a question or adds a twist."
    });
  }

  const families = [nextSentence, bestDescription, strongerVerb, betterOpening, fixRunOn, bestEnding];
  for (const fam of families) for (let i = 0; i < 20; i++) out.push(fam());

  return out; // 120 per level
}

function genWriting() {
  const all = [];
  for (let level = 1; level <= 5; level++) all.push(...genWritingLevel(level));
  return all; // 600
}

/* -------------------------
   Exported bank
   ------------------------- */

const QUESTIONS = [
  ...genNumeracy(),
  ...genReading(),
  ...genConventions(),
  ...genWriting(),
];

export function getQuestionBank() {
  return QUESTIONS;
}

export function getQuestionsByDomain(domain) {
  return QUESTIONS.filter((q) => q.domain === domain);
}
