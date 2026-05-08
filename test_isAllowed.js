// test_isAllowed.js
// Run with: node test_isAllowed.js

// ── Paste the two functions from background.js ──────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, function(ch) { return "\\" + ch; });
}

function patternToRegex(pattern) {
  if (pattern.startsWith("*.")) {
    const base = escapeRegex(pattern.slice(2));
    return new RegExp(`^https?://([^/]+\\.)?${base}(/|$)`, "i");
  }
  if (/^https?:\/\//.test(pattern) && pattern.includes("*")) {
    const regexStr = pattern.split("*").map(escapeRegex).join(".*");
    return new RegExp(`^${regexStr}`, "i");
  }
  if (!pattern.includes("/") && !pattern.includes(":")) {
    const escaped = escapeRegex(pattern);
    return new RegExp(`^https?://(([^/]+\\.)?${escaped})(/|$)`, "i");
  }
  return new RegExp(`^${escapeRegex(pattern)}`, "i");
}

function isAllowed(url, whitelist) {
  try {
    const u = new URL(url);
    for (const rule of whitelist) {
      const pattern = rule.trim();
      if (!pattern) continue;
      try {
        const regex = patternToRegex(pattern);
        if (regex.test(url)) return true;
      } catch (regexErr) {
        if (u.hostname === pattern) return true;
        if (url.startsWith(pattern)) return true;
        if (u.hostname.includes(pattern)) return true;
      }
    }
  } catch (e) {
    console.warn("Bad URL:", url);
  }
  return false;
}

// ── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(description, url, whitelist, expected) {
  const result = isAllowed(url, whitelist);
  const ok = result === expected;
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${description}`);
  if (!ok) {
    console.log(`     URL      : ${url}`);
    console.log(`     Pattern  : ${whitelist.join(", ")}`);
    console.log(`     Expected : ${expected}`);
    console.log(`     Got      : ${result}`);
  }
  ok ? passed++ : failed++;
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("\n=== PATH WILDCARD (Issue #28 core feature) ===");
test(
  "Allow w3schools python section via path wildcard",
  "https://www.w3schools.com/python/default.asp",
  ["https://www.w3schools.com/python/*"],
  true
);
test(
  "Allow another page in python section",
  "https://www.w3schools.com/python/python_intro.asp",
  ["https://www.w3schools.com/python/*"],
  true
);
test(
  "Block w3schools CSS section when only python is whitelisted",
  "https://www.w3schools.com/css/",
  ["https://www.w3schools.com/python/*"],
  false
);
test(
  "Block w3schools homepage when only python is whitelisted",
  "https://www.w3schools.com/",
  ["https://www.w3schools.com/python/*"],
  false
);
test(
  "Block w3schools JS section when only python is whitelisted",
  "https://www.w3schools.com/js/js_intro.asp",
  ["https://www.w3schools.com/python/*"],
  false
);

console.log("\n=== EXACT PAGE (no wildcard) ===");
test(
  "Allow exact page match",
  "https://www.w3schools.com/python/default.asp",
  ["https://www.w3schools.com/python/default.asp"],
  true
);
test(
  "Block different page when exact page is whitelisted",
  "https://www.w3schools.com/python/python_intro.asp",
  ["https://www.w3schools.com/python/default.asp"],
  false
);

console.log("\n=== DOMAIN-ONLY (whole site) ===");
test(
  "Allow entire domain — homepage",
  "https://www.w3schools.com/",
  ["w3schools.com"],
  true
);
test(
  "Allow entire domain — deep page",
  "https://www.w3schools.com/css/css_intro.asp",
  ["w3schools.com"],
  true
);
test(
  "Block different domain",
  "https://www.youtube.com/",
  ["w3schools.com"],
  false
);

console.log("\n=== SUBDOMAIN WILDCARD ===");
test(
  "Allow base domain via *.example.com",
  "https://example.com/page",
  ["*.example.com"],
  true
);
test(
  "Allow subdomain via *.example.com",
  "https://docs.example.com/guide",
  ["*.example.com"],
  true
);
test(
  "Block different domain with *.example.com rule",
  "https://notexample.com/",
  ["*.example.com"],
  false
);

console.log("\n=== QUERY PARAMETERS ===");
test(
  "Allow URL with query params via wildcard",
  "https://www.w3schools.com/python/default.asp?ref=home",
  ["https://www.w3schools.com/python/*"],
  true
);
test(
  "Allow specific query param pattern",
  "https://upskill.com/course?topic=python",
  ["https://upskill.com/course?topic=python*"],
  true
);
test(
  "Block different query param",
  "https://upskill.com/course?topic=java",
  ["https://upskill.com/course?topic=python*"],
  false
);

console.log("\n=== MULTIPLE RULES ===");
test(
  "Allow when one of multiple rules matches",
  "https://www.w3schools.com/python/default.asp",
  ["https://www.w3schools.com/python/*", "https://www.w3schools.com/css/*"],
  true
);
test(
  "Allow CSS section when both python and css are whitelisted",
  "https://www.w3schools.com/css/css_intro.asp",
  ["https://www.w3schools.com/python/*", "https://www.w3schools.com/css/*"],
  true
);
test(
  "Block JS section when only python and css are whitelisted",
  "https://www.w3schools.com/js/js_intro.asp",
  ["https://www.w3schools.com/python/*", "https://www.w3schools.com/css/*"],
  false
);

console.log("\n=== EDGE CASES ===");
test(
  "Empty whitelist blocks everything",
  "https://www.google.com/",
  [],
  false
);
test(
  "Empty rule is ignored",
  "https://www.google.com/",
  ["", "  "],
  false
);
test(
  "HTTP URL matched by domain rule",
  "http://example.com/page",
  ["example.com"],
  true
);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log("All tests passed! ✅");
} else {
  console.log("Some tests FAILED ❌ — check output above.");
  process.exit(1);
}
