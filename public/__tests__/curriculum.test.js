import test from "node:test";
import assert from "node:assert/strict";
import { getQuestionBank } from "../curriculum.js";

test("curriculum: bank has 4 domains and 500+ each", () => {
  const bank = getQuestionBank();
  const domains = ["numeracy", "reading", "conventions", "writing"];

  for (const d of domains) {
    const items = bank.filter((q) => q.domain === d);
    assert.ok(items.length >= 500, `${d} has ${items.length}, expected >= 500`);
  }
});

test("curriculum: each difficulty has enough questions per domain", () => {
  const bank = getQuestionBank();
  const domains = ["numeracy", "reading", "conventions", "writing"];

  for (const d of domains) {
    for (let level = 1; level <= 5; level++) {
      const items = bank.filter((q) => q.domain === d && q.difficulty === level && q.type === "mcq");
      assert.ok(items.length >= 60, `${d} level ${level} has ${items.length}, expected >= 60`);
    }
  }
});

test("curriculum: schema is valid MCQ with 4 choices", () => {
  const bank = getQuestionBank();

  for (const q of bank) {
    assert.ok(q.id && typeof q.id === "string");
    assert.ok(["numeracy", "reading", "conventions", "writing"].includes(q.domain));
    assert.ok(q.subskill && typeof q.subskill === "string");
    assert.ok(Number.isInteger(q.difficulty));
    assert.ok(q.difficulty >= 1 && q.difficulty <= 5);
    assert.equal(q.type, "mcq");

    assert.ok(typeof q.prompt === "string" && q.prompt.length > 5);

    assert.ok(Array.isArray(q.choices));
    assert.equal(q.choices.length, 4);

    const uniqueChoices = new Set(q.choices);
    assert.equal(uniqueChoices.size, 4, `choices not unique for ${q.id}`);

    assert.ok(q.choices.includes(q.correctAnswer), `correctAnswer not in choices for ${q.id}`);
  }
});

test("curriculum: variety guard (subskills + prompt uniqueness)", () => {
  const bank = getQuestionBank();
  const domains = ["numeracy", "reading", "conventions", "writing"];

  for (const d of domains) {
    const items = bank.filter((q) => q.domain === d);

    const subskills = new Set(items.map((q) => q.subskill));
    assert.ok(subskills.size >= 6, `${d} subskills=${subskills.size}, expected >= 6`);

    const prompts = new Set(items.map((q) => q.prompt));
    assert.ok(prompts.size >= 200, `${d} unique prompts=${prompts.size}, expected >= 200`);
  }
});
