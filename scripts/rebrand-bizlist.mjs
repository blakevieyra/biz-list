#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");

const replacements = [
  ["/directory", "/listings"],
  ["/community", "/feed"],
  ["/collaborate", "/partnerships"],
  ["AllConnect", "BizList"],
  ["all-connect-seven.vercel.app", "bizlist.app"],
  ["allconnect-logo.png", "bizlist-logo.png"],
  ["Business Directory", "Listings"],
  ["business directory", "listings"],
  ["Directory", "Listings"],
  ["B2B Deals", "Partnerships"],
  ["Custom form on AllConnect", "Custom form on BizList"],
  ["All Connect", "BizList"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|css|md)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const file of walk(src)) {
  if (file.includes(`${path.sep}app${path.sep}directory${path.sep}`)) continue;
  if (file.includes(`${path.sep}app${path.sep}collaborate${path.sep}`)) continue;
  if (file.includes(`${path.sep}app${path.sep}community${path.sep}`)) continue;
  let content = fs.readFileSync(file, "utf8");
  let next = content;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  if (next !== content) fs.writeFileSync(file, next);
}

// Update listings and partnerships copies
for (const sub of ["listings", "partnerships"]) {
  const dir = path.join(root, "src", "app", sub);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    let content = fs.readFileSync(file, "utf8");
    let next = content.split("/directory").join("/listings").split("/collaborate").join("/partnerships");
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    fs.writeFileSync(file, next);
  }
}

console.log("Rebrand replacements applied.");
