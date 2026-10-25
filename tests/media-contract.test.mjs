import assert from "node:assert/strict";
import { test } from "node:test";
import {
  framesForDuration,
  orientationFor,
} from "../src/core/media-contract.ts";

test("fractional source durations keep the tail within one output frame", () => {
  for (const seconds of [1 / 120, 1, 1.001, 29.97, 125.1234]) {
    const duration = framesForDuration(seconds) / 30;
    assert.ok(duration >= seconds);
    assert.ok(duration - seconds < 1 / 30);
  }
});

test("unknown or invalid durations cannot become a rendered timeline", () => {
  for (const seconds of [0, -1, NaN, Infinity]) {
    assert.throws(() => framesForDuration(seconds));
  }
});

test("orientation uses display dimensions after rotation", () => {
  assert.equal(orientationFor(1080, 1920), "portrait");
  assert.equal(orientationFor(1920, 1080), "landscape");
  assert.equal(orientationFor(1080, 1080), "square");
});
